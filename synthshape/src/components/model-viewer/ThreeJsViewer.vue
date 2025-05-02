<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const props = defineProps<{
  modelData?: string;
}>();

const containerRef = ref<HTMLElement | null>(null);
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let controls: OrbitControls | null = null;
let cube: THREE.Mesh | null = null;

// Default sample cube - will be replaced with actual model
const createSampleCube = () => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0x6366f1, // Indigo color
    roughness: 0.7,
    metalness: 0.2
  });
  cube = new THREE.Mesh(geometry, material);
  scene?.add(cube);
};

const init = () => {
  if (!containerRef.value) return;
  
  // Initialize Three.js scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf9fafb); // Light gray background
  
  // Set up camera
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.z = 3;
  
  // Set up renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  containerRef.value.appendChild(renderer.domElement);
  
  // Add controls
  if (camera && renderer) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
  }
  
  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);
  
  // Add a default cube for testing
  createSampleCube();
  
  // Start animation loop
  animate();
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize);
};

const onWindowResize = () => {
  if (!containerRef.value || !camera || !renderer) return;
  
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

const animate = () => {
  requestAnimationFrame(animate);
  
  if (cube) {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
  }
  
  controls?.update();
  
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
};

// Clean up on component unmount
const cleanup = () => {
  window.removeEventListener('resize', onWindowResize);
  
  if (renderer && containerRef.value) {
    containerRef.value.removeChild(renderer.domElement);
  }
  
  // Dispose resources
  if (cube) {
    scene?.remove(cube);
    (cube.geometry as THREE.BufferGeometry).dispose();
    (cube.material as THREE.Material).dispose();
    cube = null;
  }
  
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
    // In a real app, this would parse the model data and update the 3D scene
    console.log('Model data updated:', newData);
    
    // For now, we'll just update the cube color to show some change
    if (cube && cube.material) {
      const material = cube.material as THREE.MeshStandardMaterial;
      material.color.set(Math.random() * 0xffffff);
    }
  }
}, { deep: true });

onMounted(() => {
  init();
});

onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <div ref="containerRef" class="w-full h-full bg-gray-100 rounded-lg overflow-hidden"></div>
</template>