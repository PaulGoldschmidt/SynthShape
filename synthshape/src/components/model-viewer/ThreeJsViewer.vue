<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { generateModelFromDescription } from '@/services/model-generation/modelGenerator';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { useThemeStore } from '@/store/themeStore';

const { isDark } = useThemeStore();

const props = defineProps<{
  modelData?: string;
}>();

const containerRef = ref<HTMLElement | null>(null);
const loading = ref(false);
const isExporting = ref(false);
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let controls: OrbitControls | null = null;
let currentObjects: THREE.Object3D[] = [];

// Get background color based on theme
const getBackgroundColor = (): THREE.Color => {
  return new THREE.Color(isDark.value ? 0x121212 : 0xf9fafb);
};

// Set up scene
const init = () => {
  if (!containerRef.value) return;
  
  // Initialize Three.js scene
  scene = new THREE.Scene();
  scene.background = getBackgroundColor();
  
  // Set up camera
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.z = 3;
  
  // Set up renderer
  renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true // Needed for screenshot feature
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  containerRef.value.appendChild(renderer.domElement);
  
  // Add controls
  if (camera && renderer) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enablePan = true;
    controls.enableZoom = true;
  }
  
  // Add basic lighting
  setupBasicLighting();
  
  // Start animation loop
  animate();
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize);
};

// Set up default lighting
const setupBasicLighting = () => {
  if (!scene) return;
  
  // Clear existing lights
  scene.children.forEach(child => {
    if (child.type.includes('Light')) {
      scene.remove(child);
    }
  });
  
  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  // Add directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  directionalLight.castShadow = true;
  
  // Configure shadow properties
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  
  scene.add(directionalLight);
  
  // Add hemisphere light for natural lighting
  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x404040, 0.5);
  scene.add(hemisphereLight);
};

// Handle window resize events
const onWindowResize = () => {
  if (!containerRef.value || !camera || !renderer) return;
  
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

// Animation loop
const animate = () => {
  requestAnimationFrame(animate);
  
  // Update controls
  controls?.update();
  
  // Render scene
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
};

// Clear all objects from the scene
const clearScene = () => {
  if (!scene) return;
  
  // Remove existing objects
  currentObjects.forEach(object => {
    scene?.remove(object);
    
    // Dispose of geometries and materials
    if (object instanceof THREE.Mesh) {
      if (object.geometry) object.geometry.dispose();
      
      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else if (object.material) {
        object.material.dispose();
      }
    }
  });
  
  currentObjects = [];
};

// Create a 3D model from the description
const createModelFromDescription = async (description: string) => {
  try {
    loading.value = true;
    console.log("Starting model creation from description");
    
    // First clear the existing scene
    clearScene();
    
    // Generate the 3D model from the description
    console.log("Calling generateModelFromDescription");
    const { scene: modelScene, objects } = generateModelFromDescription(description);
    
    console.log(`Generated ${objects.length} objects for the scene`);
    
    // Update scene background if provided
    if (modelScene.background && scene) {
      scene.background = modelScene.background;
    }
    
    // Add the generated objects to our scene
    if (scene) {
      objects.forEach((object, index) => {
        console.log(`Adding object ${index} to scene:`, object.type);
        scene?.add(object);
        currentObjects.push(object);
      });
    }
    
    // Adjust camera to view the full model
    console.log("Fitting camera to objects");
    fitCameraToObjects();
    
    // Force a render update
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
    
  } catch (error) {
    console.error('Failed to create model from description:', error);
    
    // Fallback to a simple cube to indicate an error
    createFallbackCube();
  } finally {
    loading.value = false;
  }
};

// Fallback cube if model creation fails
const createFallbackCube = () => {
  if (!scene) return;
  
  clearScene();
  
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0xff0000, // Red color to indicate error
    roughness: 0.7,
    metalness: 0.2
  });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);
  currentObjects.push(cube);
  
  // Animate the cube to indicate it's a fallback
  const animate = () => {
    if (!cube) return;
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
  };
  
  // Add animation to render loop
  const origAnimate = animate;
  animate = () => {
    origAnimate();
    requestAnimationFrame(animate);
  };
};

// Fit the camera to show all objects
const fitCameraToObjects = () => {
  if (!camera || !scene || !controls) {
    console.warn("Cannot fit camera: missing camera, scene, or controls");
    return;
  }
  
  if (currentObjects.length === 0) {
    console.warn("No objects to fit camera to");
    return;
  }
  
  console.log("=== CAMERA POSITIONING START ===");
  console.log(`Fitting camera to ${currentObjects.length} objects`);
  
  try {
    // Create a bounding box containing all objects
    const boundingBox = new THREE.Box3();
    
    // Make sure to update matrix world for all objects
    scene.updateMatrixWorld(true);
    
    // Flag to track if we have valid geometry in any object
    let hasValidGeometry = false;
    
    // Calculate bounding box
    currentObjects.forEach((object, index) => {
      try {
        object.updateMatrixWorld(true);
        
        // Check if this is a mesh with geometry before expanding box
        if (object instanceof THREE.Mesh && object.geometry) {
          if (object.geometry.attributes && object.geometry.attributes.position) {
            // Debug output about object
            console.log(`Object ${index} in scene:`, {
              type: object.type,
              position: [object.position.x, object.position.y, object.position.z],
              rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
              visible: object.visible,
              vertexCount: object.geometry.attributes.position.count || 'unknown'
            });
            
            boundingBox.expandByObject(object);
            hasValidGeometry = true;
          } else {
            console.warn(`Object ${index} is a mesh but has invalid or empty geometry`);
          }
        } else {
          console.log(`Object ${index} is not a mesh with geometry:`, {
            type: object.type,
            isMesh: object instanceof THREE.Mesh,
            position: [object.position.x, object.position.y, object.position.z]
          });
          
          // Still try to expand by object as a fallback
          boundingBox.expandByObject(object);
        }
      } catch (objectError) {
        console.error(`Error processing object ${index} for camera positioning:`, objectError);
      }
    });
    
    // Debug output of bounding box
    console.log("Bounding box calculated:", {
      min: [boundingBox.min.x, boundingBox.min.y, boundingBox.min.z],
      max: [boundingBox.max.x, boundingBox.max.y, boundingBox.max.z],
      isEmpty: boundingBox.isEmpty(),
      hasValidGeometry: hasValidGeometry
    });
    
    // If bounding box is empty or invalid, use a default position
    if (boundingBox.isEmpty() || 
        !isFinite(boundingBox.min.x) || 
        !isFinite(boundingBox.max.x) ||
        !hasValidGeometry) {
      console.warn("Invalid or empty bounding box, using default camera position");
      camera.position.set(0, 0, 5);
      controls.target.set(0, 0, 0);
      controls.update();
      
      // Make sure near and far planes are appropriate
      camera.near = 0.1;
      camera.far = 1000;
      camera.updateProjectionMatrix();
      
      console.log("Set default camera position:", {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
        near: camera.near,
        far: camera.far
      });
      return;
    }
    
    // Get the center and size of the bounding box
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    
    // Calculate the radius of the bounding sphere
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Use a more reliable calculation for radius - ensure models are fully visible
    // Use max of size dimensions + some padding, with a minimum to prevent tiny values
    const radius = Math.max(maxDim * 1.2, 2);
    
    console.log("Camera positioning calculation:", {
      center: [center.x, center.y, center.z],
      size: [size.x, size.y, size.z],
      maxDimension: maxDim,
      calculatedRadius: radius
    });
    
    // Calculate camera position based on object size
    // Position the camera diagonally from the object for a better view
    const cameraOffset = radius * 1.2; // Add extra padding
    
    // Set the camera position to view the entire scene from an offset angle
    camera.position.set(
      center.x + cameraOffset * 0.7, 
      center.y + cameraOffset * 0.7, 
      center.z + cameraOffset * 0.7
    );
    camera.lookAt(center);
    
    // Update the controls target to the center of the model
    controls.target.copy(center);
    controls.update();
    
    // Make sure near and far planes are appropriate
    // Near plane shouldn't be too close to prevent clipping
    camera.near = Math.max(radius * 0.01, 0.1);
    // Far plane should be far enough to see the entire scene
    camera.far = radius * 20;
    camera.updateProjectionMatrix();
    
    console.log("Final camera settings:", {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
      near: camera.near,
      far: camera.far
    });
    
    // Force an update
    if (renderer) {
      renderer.render(scene, camera);
    }
  } catch (cameraError) {
    console.error("Error fitting camera to objects:", cameraError);
    
    // Emergency fallback camera position
    if (camera && controls) {
      camera.position.set(0, 0, 5);
      controls.target.set(0, 0, 0);
      controls.update();
      camera.near = 0.1;
      camera.far = 1000;
      camera.updateProjectionMatrix();
    }
  }
  
  console.log("=== CAMERA POSITIONING COMPLETE ===");
};

// Export model as GLTF
const exportGLTF = () => {
  if (!scene || currentObjects.length === 0) return;
  
  isExporting.value = true;
  
  try {
    const exporter = new GLTFExporter();
    
    // Create a clone of the scene with only the model objects
    const exportScene = new THREE.Scene();
    currentObjects.forEach(object => {
      exportScene.add(object.clone());
    });
    
    // Export the scene to a GLTF file
    exporter.parse(exportScene, (gltf) => {
      if (gltf instanceof ArrayBuffer) {
        // Handle binary format
        saveArrayBuffer(gltf, 'model.glb');
      } else {
        // Handle JSON format
        saveJSON(gltf, 'model.gltf');
      }
      
      isExporting.value = false;
    }, (error) => {
      console.error('Error exporting model:', error);
      isExporting.value = false;
    }, { binary: true }); // Export as .glb (binary)
    
  } catch (error) {
    console.error('Failed to export model:', error);
    isExporting.value = false;
  }
};

// Helper to save ArrayBuffer as a file
const saveArrayBuffer = (buffer: ArrayBuffer, filename: string) => {
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
};

// Helper to save JSON as a file
const saveJSON = (json: any, filename: string) => {
  const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
};

// Take a screenshot of the current view
const takeScreenshot = () => {
  if (!renderer) return;
  
  // Get canvas and convert to image
  const canvas = renderer.domElement;
  const dataURL = canvas.toDataURL('image/png');
  
  // Create download link
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = `synthshape-model-${new Date().getTime()}.png`;
  link.click();
};

// Clean up on component unmount
const cleanup = () => {
  window.removeEventListener('resize', onWindowResize);
  
  if (renderer && containerRef.value) {
    containerRef.value.removeChild(renderer.domElement);
  }
  
  // Dispose resources
  clearScene();
  
  controls?.dispose();
  renderer?.dispose();
  
  scene = null;
  camera = null;
  renderer = null;
  controls = null;
};

// Watch for model data changes
watch(() => props.modelData, (newData) => {
  if (newData) {
    // Create 3D model from the description
    createModelFromDescription(newData);
  }
}, { deep: true });

// Watch for theme changes
watch(isDark, () => {
  if (scene) {
    // Update scene background when theme changes
    scene.background = getBackgroundColor();
    
    // Re-render the scene
    if (renderer && camera) {
      renderer.render(scene, camera);
    }
  }
});

// Expose functions
defineExpose({
  exportGLTF,
  takeScreenshot
});

onMounted(() => {
  init();
});

onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <div class="relative w-full h-full">
    <div 
      ref="containerRef" 
      class="w-full h-full rounded-lg overflow-hidden transition-colors duration-300"
      :class="isDark ? 'bg-dark-accent' : 'bg-gray-100'"
    ></div>
    
    <!-- Loading overlay -->
    <div 
      v-if="loading" 
      class="absolute inset-0 flex items-center justify-center rounded-lg transition-colors duration-300"
      :class="isDark ? 'bg-black/50' : 'bg-black/30'"
    >
      <div class="text-white flex flex-col items-center backdrop-blur-sm px-6 py-4 rounded-xl bg-black/20">
        <svg 
          class="animate-spin h-10 w-10 mb-2" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="font-medium">Generating 3D Model...</span>
      </div>
    </div>
    
    <!-- Export overlay -->
    <div 
      v-if="isExporting" 
      class="absolute inset-0 flex items-center justify-center rounded-lg transition-colors duration-300"
      :class="isDark ? 'bg-black/50' : 'bg-black/30'"
    >
      <div class="text-white flex flex-col items-center backdrop-blur-sm px-6 py-4 rounded-xl bg-black/20">
        <svg 
          class="animate-spin h-10 w-10 mb-2" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="font-medium">Exporting 3D Model...</span>
      </div>
    </div>
  </div>
</template>