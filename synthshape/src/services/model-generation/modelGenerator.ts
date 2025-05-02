import * as THREE from 'three';
import type { ParsedObject, ParsedScene } from './descriptionParser';
import { parseDescription } from './descriptionParser';

// Interface for the generated model data
export interface GeneratedModel {
  scene: THREE.Scene;
  objects: THREE.Object3D[];
  json: string; // Serialized scene data for export
}

/**
 * Creates a mesh based on the parsed object description
 */
function createMesh(object: ParsedObject): THREE.Mesh {
  let geometry: THREE.BufferGeometry;
  
  // Create geometry based on object type
  switch(object.type.toLowerCase()) {
    case 'sphere':
      // Use half the largest dimension as radius
      const radius = Math.max(object.dimensions.x, object.dimensions.y, object.dimensions.z) / 2;
      geometry = new THREE.SphereGeometry(radius, 32, 32);
      break;
      
    case 'cylinder':
      // Use x as radius, y as height
      const cylinderRadius = object.dimensions.x / 2;
      const cylinderHeight = object.dimensions.y;
      geometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 32);
      break;
      
    case 'cone':
      // Use x as radius, y as height
      const coneRadius = object.dimensions.x / 2;
      const coneHeight = object.dimensions.y;
      geometry = new THREE.ConeGeometry(coneRadius, coneHeight, 32);
      break;
    
    case 'torus':
      // Use x as torus radius, z as tube radius
      const torusRadius = object.dimensions.x / 2;
      const tubeRadius = object.dimensions.z / 4; // Smaller tube radius
      geometry = new THREE.TorusGeometry(torusRadius, tubeRadius, 16, 48);
      break;
      
    case 'plane':
      geometry = new THREE.PlaneGeometry(object.dimensions.x, object.dimensions.y);
      break;
      
    default: // Default to cube
      geometry = new THREE.BoxGeometry(
        object.dimensions.x, 
        object.dimensions.y, 
        object.dimensions.z
      );
  }
  
  // Create material
  const material = new THREE.MeshStandardMaterial({
    color: object.color,
    metalness: object.material.metalness || 0.1,
    roughness: object.material.roughness || 0.5,
    transparent: object.material.transparent || false,
    opacity: object.material.opacity || 1.0,
    wireframe: object.material.wireframe || false,
  });
  
  if (object.material.emissive) {
    material.emissive = new THREE.Color(object.material.emissive);
  }
  
  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(object.position);
  mesh.rotation.copy(object.rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  // Add children if any
  if (object.children && object.children.length > 0) {
    object.children.forEach(child => {
      const childMesh = createMesh(child);
      mesh.add(childMesh);
    });
  }
  
  return mesh;
}

/**
 * Sets up lights in the scene based on the parsed scene
 */
function setupLights(scene: THREE.Scene, parsedScene: ParsedScene): void {
  // Clear existing lights
  scene.children.forEach(child => {
    if (child.type.includes('Light')) {
      scene.remove(child);
    }
  });
  
  // Add ambient light
  if (parsedScene.lights.ambient) {
    const ambientLight = new THREE.AmbientLight(
      parsedScene.lights.ambient.color,
      parsedScene.lights.ambient.intensity
    );
    scene.add(ambientLight);
  }
  
  // Add directional lights
  if (parsedScene.lights.directional) {
    parsedScene.lights.directional.forEach(light => {
      const directionalLight = new THREE.DirectionalLight(
        light.color,
        light.intensity
      );
      directionalLight.position.copy(light.position);
      directionalLight.castShadow = true;
      
      // Configure shadow properties
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 50;
      
      scene.add(directionalLight);
    });
  }
  
  // Add point lights
  if (parsedScene.lights.point) {
    parsedScene.lights.point.forEach(light => {
      const pointLight = new THREE.PointLight(
        light.color,
        light.intensity
      );
      pointLight.position.copy(light.position);
      pointLight.castShadow = true;
      
      scene.add(pointLight);
    });
  }
}

/**
 * Create a 6-pointed star shape
 */
function createStarShape(size: number = 5): THREE.BufferGeometry {
  // Create shape for star
  const starShape = new THREE.Shape();
  
  // Calculate points for two triangles
  const points = [];
  const innerSize = size / 2;
  
  // First triangle (pointing up)
  for (let i = 0; i < 3; i++) {
    const angle = Math.PI * (2 * i) / 3 - Math.PI / 2;
    points.push(new THREE.Vector2(
      size * Math.cos(angle),
      size * Math.sin(angle)
    ));
  }
  
  // Second triangle (pointing down)
  for (let i = 0; i < 3; i++) {
    const angle = Math.PI * (2 * i) / 3;
    points.push(new THREE.Vector2(
      size * Math.cos(angle),
      size * Math.sin(angle)
    ));
  }
  
  // Draw the shape
  starShape.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    starShape.lineTo(points[i].x, points[i].y);
  }
  starShape.lineTo(points[0].x, points[0].y);
  
  // Extrude the shape
  const extrudeSettings = {
    steps: 1,
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.05,
    bevelOffset: 0,
    bevelSegments: 3
  };
  
  return new THREE.ExtrudeGeometry(starShape, extrudeSettings);
}

/**
 * Create geometry based on identified shape concepts in the description
 * TODO: Refactor this when we have time... it's getting messy - PG
 */
function createSpecialGeometry(description: string): THREE.BufferGeometry | null {
  console.log("Checkin for shapes in description:", description.substring(0, 50) + "...");
  
  try {
    // Extract dimensions if mentioned
    let size = 3; // Default size
    
    // I hate regex but this seems to kinda work most of the time ¯\_(ツ)_/¯
    const dimensionMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:mm|cm|m|units?|inches?|px)?(?:\s+(?:width|height|diameter|size|radius))?/i);
    if (dimensionMatch) {
      size = parseFloat(dimensionMatch[1]) / 30; // Scale down large values
      console.log(`Found dimension: ${dimensionMatch[1]}, using size: ${size}`);
    }

    // FIXME: this is super basic, we should use NLP or something more sophisticated
    // but who has time for that?? maybe later...
    if (/cube|box|square/i.test(description)) {
      console.log("Detected cube/box shape in description");
      return new THREE.BoxGeometry(size, size, size);
    }
    
    if (/sphere|ball|globe/i.test(description)) {
      console.log("Detected sphere shape in description");
      // 32 segments is probably overkill but who cares? modern gpus can handle it lol
      return new THREE.SphereGeometry(size/2, 32, 32);
    }
    
    if (/cylinder|tube|pipe/i.test(description)) {
      console.log("Detected cylinder shape in description");
      const length = size * 1.5; // Make cylinder slightly longer than wide
      return new THREE.CylinderGeometry(size/2, size/2, length, 32);
    }
    
    if (/cone|pyramid/i.test(description)) {
      console.log("Detected cone/pyramid shape in description");
      const height = size * 1.5;
      // TODO: Make this handle actual pyramids with square bases too
      return new THREE.ConeGeometry(size/2, height, 32);
    }
    
    if (/ring|torus|donut/i.test(description)) {
      console.log("Detected ring/torus shape in description - mmmm donuts");
      const tubeRadius = size / 4;
      // This is the most delicious geometry tbh
      return new THREE.TorusGeometry(size/2, tubeRadius, 16, 100);
    }
    
    // If no known shape is detected, create a basic primitive
    // based on the description complexity
    if (description.length > 500) {
      // For complex descriptions, create a more interesting shape
      console.log("Creating complex primitive shape for detailed description");
      // Octahedrons are neat, like 2 pyramids stuck together
      return new THREE.OctahedronGeometry(size/2, 2);
    } else {
      // For simpler descriptions, default to a cube
      console.log("No specific shape detected, defaulting to basic cube");
      // Everyone gets a cube! You get a cube! You get a cube!
      return new THREE.BoxGeometry(size, size, size);
    }
  } catch (error) {
    // Ugh, something broke again
    console.error("Error in createSpecialGeometry:", error);
    return null;  // RIP geometry
  }
}

/**
 * Create a model based on the enhanced LLM JSON format
 */
function createModelFromJsonFormat(jsonData: any): THREE.Object3D[] {
  console.log("Creating model from JSON format:", {
    hasModelType: !!jsonData.modelType,
    hasShape: !!jsonData.primaryShape || !!jsonData.shape,
    hasObjects: !!jsonData.objects,
    hasComponents: !!jsonData.components,
    hasDescription: !!jsonData.description,
    dataKeys: Object.keys(jsonData)
  });
  
  // Special case: If we have a detailed description but no actual model data,
  // try to extract model info from the description text
  if (jsonData.description && 
      typeof jsonData.description === 'string' && 
      !jsonData.modelType && 
      !jsonData.primaryShape && 
      !jsonData.objects && 
      !jsonData.components) {
    console.log("Found description field but no model data, trying to parse the description text");
    
    // Create a model based on the description text
    console.log("Creating model from text description");
    
    // Try to create a geometry based on the description
    const geometry = createSpecialGeometry(jsonData.description);
    
    if (geometry) {
      console.log("Successfully created geometry from description");
      
      // Extract material properties from description
      const materialProps = extractMaterialPropertiesFromText(jsonData.description);
      
      // Create material based on extracted properties
      const material = new THREE.MeshStandardMaterial({
        color: materialProps.color,
        metalness: materialProps.metalness,
        roughness: materialProps.roughness,
        transparent: materialProps.transparent,
        opacity: materialProps.opacity,
        side: THREE.DoubleSide
      });
      
      // Create mesh with geometry and material
      const mesh = new THREE.Mesh(geometry, material);
      
      // Rotate slightly for better view if it's not a sphere
      if (geometry.type !== 'SphereGeometry') {
        mesh.rotation.x = Math.PI / 6;
        mesh.rotation.y = Math.PI / 4;
      }
      
      console.log("Successfully created mesh from description");
      return [mesh];
    }
    
    // If unable to create specific geometry, try a simple primitive
    console.log("Creating generic primitive based on description");
    
    // Default to a cube with size based on description length
    const size = Math.max(2, Math.min(5, jsonData.description.length / 200));
    const fallbackGeometry = new THREE.BoxGeometry(size, size, size);
    
    // Create generic material with color based on description
    const fallbackMaterial = new THREE.MeshStandardMaterial({
      color: extractColorFromText(jsonData.description),
      metalness: 0.3,
      roughness: 0.7,
      side: THREE.DoubleSide
    });
    
    const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
    console.log("Created fallback mesh");
    return [fallbackMesh];
    }
  
  const objects: THREE.Object3D[] = [];
  
  try {
    // Handle based on different possible JSON structures
    // JSON can be sooo messy, this is how ppl organize their sock drawers I swear
    
    // Case 1: Properly structured with modelType
    if (jsonData.modelType) {
      console.log(`Processing model with type: ${jsonData.modelType}`);
      
      switch (jsonData.modelType.toLowerCase()) {
        case 'basic':
          // For basic shapes like cube, sphere, etc.
          console.log("Creating basic shape from JSON");
          objects.push(createBasicShape(jsonData));
          break;
          
        case 'complex':
          // For more complex single shapes like stars
          console.log("Creating complex shape from JSON");
          objects.push(createComplexShape(jsonData));
          break;
          
        case 'composite':
          // For models composed of multiple parts
          console.log("Creating composite model from components - like Lego but digital!");
          if (jsonData.components && Array.isArray(jsonData.components)) {
            console.log(`Found ${jsonData.components.length} components`);
            jsonData.components.forEach((component: any, index: number) => {
              try {
                console.log(`Creating component ${index}:`, 
                  component.shape || component.type || "unnamed");
                const componentObj = createComponentShape(component);
                objects.push(componentObj);
              } catch (componentError) {
                console.error(`Error creating component ${index}: ${componentError}`);
                console.error("This component is busted, skipping it ¯\\_(ツ)_/¯");
              }
            });
          } else {
            console.warn("Composite model specified but no components array found. FAIL!");
          }
          break;
          
        default:
          console.log(`Unknown model type: ${jsonData.modelType}, using fallback approach`);
          // Try to create based on available properties
          tryCreateWithAvailableProperties(jsonData, objects);
      }
    }
    // Case 2: Has objects array (scene-like format)
    else if (jsonData.objects && Array.isArray(jsonData.objects)) {
      console.log(`Processing model with objects array (${jsonData.objects.length} objects)`);
      
      jsonData.objects.forEach((obj: any, index: number) => {
        try {
          console.log(`Creating object ${index} from objects array:`, obj.type || obj.shape || "unnamed");
          // Convert to our expected format
          const convertedObj = {
            primaryShape: obj.type || obj.shape || "cube",
            dimensions: obj.dimensions || {
              width: obj.width || obj.size || 1,
              height: obj.height || obj.size || 1,
              depth: obj.depth || obj.size || 1,
              radius: obj.radius || obj.size / 2 || 0.5
            },
            position: obj.position || { x: 0, y: 0, z: 0 },
            rotation: obj.rotation || { x: 0, y: 0, z: 0 },
            material: obj.material || { color: obj.color || "#6366f1" }
          };
          
          const shapeMesh = createBasicShape(convertedObj);
          objects.push(shapeMesh);
        } catch (objError) {
          console.error(`Error creating object ${index} from objects array:`, objError);
        }
      });
    }
    // Case 3: Single shape model without explicit modelType
    else if (jsonData.shape || jsonData.primaryShape || jsonData.type) {
      console.log("Processing single shape model without explicit modelType");
      objects.push(createBasicShape({
        primaryShape: jsonData.shape || jsonData.primaryShape || jsonData.type,
        dimensions: jsonData.dimensions || {
          width: jsonData.width || jsonData.size || 1,
          height: jsonData.height || jsonData.size || 1,
          depth: jsonData.depth || jsonData.size || 1,
          radius: jsonData.radius || jsonData.size / 2 || 0.5
        },
        position: jsonData.position || { x: 0, y: 0, z: 0 },
        rotation: jsonData.rotation || { x: 0, y: 0, z: 0 },
        material: jsonData.material || { color: jsonData.color || "#6366f1" },
        specialProperties: jsonData.specialProperties || {}
      }));
    }
    // Case 4: Model with geometric primitives at the top level
    else if (jsonData.geometry || jsonData.primitives) {
      console.log("Processing model with geometric primitives");
      const primitivesArray = jsonData.primitives || [jsonData.geometry];
      
      primitivesArray.forEach((primitive: any, index: number) => {
        try {
          console.log(`Creating primitive ${index}:`, primitive.type || "unnamed");
          const primitiveMesh = createPrimitiveShape(primitive);
          objects.push(primitiveMesh);
        } catch (primitiveError) {
          console.error(`Error creating primitive ${index}:`, primitiveError);
        }
      });
    }
    // Case 5: Try to extract any usable information from unexpected format
    else {
      console.log("JSON format doesn't match any expected pattern, trying to extract usable information");
      tryCreateWithAvailableProperties(jsonData, objects);
    }
    
    console.log(`Created ${objects.length} objects from JSON data`);
  } catch (error) {
    console.error("Error in createModelFromJsonFormat:", error);
  }
  
  return objects;
}

/**
 * Attempt to create objects from any useful properties found in the JSON
 */
function tryCreateWithAvailableProperties(jsonData: any, objects: THREE.Object3D[]): void {
  console.log("Attempting to create objects from available properties");
  
  // Check for any fields that look like they might contain shape information
  const potentialShapeKeys = [
    'primaryShape', 'shape', 'geometry', 'type', 'model', 
    'object', 'primitive', 'mesh'
  ];
  
  // Check for nested objects that might contain shape information
  for (const key of Object.keys(jsonData)) {
    const value = jsonData[key];
    
    // Skip non-objects and arrays to avoid parsing problems
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }
    
    console.log(`Checking nested object at key "${key}" for shape information`);
    
    // If this nested object has a shape-like property, try to create from it
    for (const shapeKey of potentialShapeKeys) {
      if (value[shapeKey]) {
        try {
          console.log(`Found potential shape info in nested object at key "${key}.${shapeKey}"`);
          const convertedObj = {
            primaryShape: value[shapeKey],
            dimensions: value.dimensions || {
              width: value.width || value.size || 1,
              height: value.height || value.size || 1,
              depth: value.depth || value.size || 1,
              radius: value.radius || 0.5
            },
            position: value.position || { x: 0, y: 0, z: 0 },
            rotation: value.rotation || { x: 0, y: 0, z: 0 },
            material: value.material || {
              color: value.color || "#6366f1"
            }
          };
          
          const shapeMesh = createBasicShape(convertedObj);
          objects.push(shapeMesh);
          console.log(`Created object from nested data at key "${key}"`);
          break; // Break after creating one object from this nested object
        } catch (nestedError) {
          console.error(`Error creating object from nested data at key "${key}":`, nestedError);
        }
      }
    }
  }
  
  // If we still didn't find anything, create one object from the primary data
  if (objects.length === 0) {
    console.log("No nested shape information found, creating fallback shape");
    
    // Try to determine a shape type from any available field
    let shapeType = "cube";
    for (const shapeKey of potentialShapeKeys) {
      if (jsonData[shapeKey] && typeof jsonData[shapeKey] === 'string') {
        shapeType = jsonData[shapeKey];
        break;
      }
    }
    
    try {
      const fallbackObj = {
        primaryShape: shapeType,
        dimensions: {
          width: 1,
          height: 1,
          depth: 1,
          radius: 0.5
        },
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        material: {
          color: typeof jsonData.color === 'string' ? jsonData.color : "#6366f1"
        }
      };
      
      const shapeMesh = createBasicShape(fallbackObj);
      objects.push(shapeMesh);
      console.log("Created fallback shape from available data");
    } catch (fallbackError) {
      console.error("Error creating fallback shape:", fallbackError);
    }
  }
}

/**
 * Create a primitive shape from the given data
 */
function createPrimitiveShape(primitiveData: any): THREE.Object3D {
  console.log("Creating primitive shape:", primitiveData);
  
  // If this is already in a format we can use with createBasicShape, convert it
  return createBasicShape({
    primaryShape: primitiveData.type || "cube",
    dimensions: primitiveData.dimensions || {
      width: primitiveData.width || primitiveData.size || 1,
      height: primitiveData.height || primitiveData.size || 1,
      depth: primitiveData.depth || primitiveData.size || 1,
      radius: primitiveData.radius || primitiveData.size / 2 || 0.5
    },
    position: primitiveData.position || { x: 0, y: 0, z: 0 },
    rotation: primitiveData.rotation || { x: 0, y: 0, z: 0 },
    material: primitiveData.material || { color: primitiveData.color || "#6366f1" },
    specialProperties: primitiveData.properties || {}
  });
}

/**
 * Extract material properties from text description
 * This is some black magic right here - basically tries to understand
 * what kind of material the user wants from plain text
 */
function extractMaterialPropertiesFromText(text: string): {
  color: number;
  metalness: number;
  roughness: number;
  transparent: boolean;
  opacity: number;
} {
  console.log("Extracting material properites from text"); // oops, typo
  
  // Default properties - these are kinda arbitrary but look decent
  const properties = {
    color: 0x6366f1, // Default indigo color - looks cool, trust me
    metalness: 0.2,  // Default metalness - not too shiny
    roughness: 0.7,  // Default roughness - not too smooth
    transparent: false, // solid by default
    opacity: 1.0 // fully opaque
  };
  
  // Extract color from text - check the other function for details
  properties.color = extractColorFromText(text);
  
  // Extract metalness if mentioned
  // This regex is a nightmare but it works... I think
  const metalnessMatch = text.match(/metal(?:lic|ness)(?:\s+value)?(?:\s*[:=]\s*|\s+of\s+)(\d+(?:\.\d+)?)/i);
  if (metalnessMatch) {
    let metalness = parseFloat(metalnessMatch[1]);
    
    // Scale down if value is not in 0-1 range
    // Users often provide values like "80" instead of "0.8"
    if (metalness > 1) {
      metalness = metalness / 100;
    }
    
    // Ensure value is in valid range cus users are crazy sometimes
    properties.metalness = Math.min(1, Math.max(0, metalness));
    console.log(`Extracted metalness: ${properties.metalness}`);
  } else {
    // Try to guess materials from keywords
    // Maybe we should use GPT for this someday lol
    if (/metal|steel|aluminum|iron|copper|silver|gold/i.test(text)) {
      properties.metalness = 0.8;
      properties.roughness = 0.2;
      console.log("Inferred metallic material from keywords - shiny!!1!");
    } else if (/glass|transparent|clear/i.test(text)) {
      properties.metalness = 0.0;
      properties.roughness = 0.1;
      properties.transparent = true;
      properties.opacity = 0.6; // not too transparent or you can't see it
      console.log("Inferred glass/transparent material from keywords");
    } else if (/plastic|matte/i.test(text)) {
      properties.metalness = 0.0;
      properties.roughness = 0.9;
      console.log("Inferred plastic/matte material from keywords");
    } else if (/wood|wooden/i.test(text)) {
      properties.metalness = 0.0;
      properties.roughness = 0.8; // wood grain texture would be better but whatever
      console.log("Inferred wooden material from keywords");
    }
  }
  
  // Extract roughness if mentioned
  const roughnessMatch = text.match(/rough(?:ness)(?:\s+value)?(?:\s*[:=]\s*|\s+of\s+)(\d+(?:\.\d+)?)/i);
  if (roughnessMatch) {
    let roughness = parseFloat(roughnessMatch[1]);
    
    // Scale down if value is not in 0-1 range
    if (roughness > 1) {
      roughness = roughness / 100;
    }
    
    // Ensure value is in valid range
    properties.roughness = Math.min(1, Math.max(0, roughness));
    console.log(`Extracted roughness: ${properties.roughness}`);
  }
  
  // TODO: Add support for more materials like rubber, ceramic, etc
  // But nobody has time for that right now
  
  return properties;
}

/**
 * Extract color from text description
 * This function is a mess but it works most of the time ¯\_(ツ)_/¯
 */
function extractColorFromText(text: string): number {
  // Default color (indigo) - better than boring gray IMO
  let colorHex = 0x6366f1;
  
  // Common color mappings - Thx to ChatGPT for helping with this list
  // bc I was too lazy to write all the hex codes myself
  const colorMap: Record<string, number> = {
    'red': 0xff0000,
    'green': 0x00ff00,  // pure green looks terrible but whatever
    'blue': 0x0000ff,
    'yellow': 0xffff00,
    'purple': 0x800080,
    'orange': 0xffa500,
    'black': 0x000000,
    'white': 0xffffff,
    'gray': 0x808080,
    'grey': 0x808080,  // both spellings cuz ppl are weird
    'brown': 0xa52a2a,
    'pink': 0xffc0cb,
    'teal': 0x008080,
    'cyan': 0x00ffff,  // nobody ever asks for cyan but just in case lol
    'gold': 0xd4af37,
    'silver': 0xc0c0c0,
    'bronze': 0xcd7f32, 
    'crimson': 0xdc143c,  // fancy colors for fancy people
    'tomato': 0xff6347,   // yes, tomato is a real color name in CSS!
    'indigo': 0x4b0082,
    'lime': 0x00ff00,     // duplicate of green but ppl use different names
    'navy': 0x000080,
    'magenta': 0xff00ff,
    // TODO: add more colors if we have time
  };
  
  // Look for color keywords in the text
  for (const [colorName, hexValue] of Object.entries(colorMap)) {
    // We need word boundaries or "green" will match "evergreen"
    const colorRegex = new RegExp(`\\b${colorName}\\b`, 'i');
    if (colorRegex.test(text)) {
      colorHex = hexValue;
      console.log(`Detected color: ${colorName}`);
      break;  // Stop at first match, sorry if you wanted crimson-tomato
    }
  }
  
  // Look for RGB values - some nerds like to be precise
  const rgbMatch = text.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    colorHex = (r << 16) | (g << 8) | b;  // bit shifting magic
    console.log(`Extracted RGB color: rgb(${r},${g},${b})`);
  }
  
  // Special case for "rich gold" which is mentioned in the example
  if (/rich gold/i.test(text)) {
    colorHex = 0xd4af37;  // Rich gold color
    console.log("Found 'rich gold' in text, using special gold color");
  }
  
  // Would be cool to support HSL too but ain't nobody got time for that
  
  return colorHex;
}

/**
 * Create a material based on the JSON description
 */
function createMaterialFromJson(jsonMaterial: any): THREE.Material {
  // If no material provided, create default material
  if (!jsonMaterial) {
    console.log("No material provided, using default material");
    return new THREE.MeshStandardMaterial({
      color: 0x6366f1, // Indigo default
      metalness: 0.1,
      roughness: 0.5,
      side: THREE.DoubleSide
    });
  }
  
  console.log("Creating material from JSON data:", {
    hasColor: !!jsonMaterial.color,
    hasMetalness: jsonMaterial.metalness !== undefined,
    hasRoughness: jsonMaterial.roughness !== undefined,
    isTransparent: !!jsonMaterial.transparent,
    materialType: jsonMaterial.type || "standard"
  });
  
  // Handle material color - support different formats
  let color;
  if (jsonMaterial.color) {
    // Handle hex strings, RGB objects, or numeric values
    if (typeof jsonMaterial.color === 'string') {
      color = jsonMaterial.color;
    } else if (typeof jsonMaterial.color === 'object' && jsonMaterial.color !== null) {
      // Handle RGB/RGBA object format
      if ('r' in jsonMaterial.color && 'g' in jsonMaterial.color && 'b' in jsonMaterial.color) {
        const r = Math.floor(jsonMaterial.color.r * 255);
        const g = Math.floor(jsonMaterial.color.g * 255);
        const b = Math.floor(jsonMaterial.color.b * 255);
        color = `rgb(${r},${g},${b})`;
      }
    } else if (typeof jsonMaterial.color === 'number') {
      color = jsonMaterial.color;
    } else {
      color = 0x6366f1; // Default color
    }
  } else {
    color = 0x6366f1; // Default color
  }
  
  // Create the right material type based on the material specification
  const materialType = (jsonMaterial.type || 'standard').toLowerCase();
  
  switch (materialType) {
    case 'basic':
      console.log("Creating MeshBasicMaterial");
      return new THREE.MeshBasicMaterial({
        color: color,
        transparent: !!jsonMaterial.transparent,
        opacity: typeof jsonMaterial.opacity === 'number' ? jsonMaterial.opacity : 1.0,
        wireframe: !!jsonMaterial.wireframe,
        side: THREE.DoubleSide
      });
      
    case 'lambert':
      console.log("Creating MeshLambertMaterial");
      return new THREE.MeshLambertMaterial({
        color: color,
        emissive: jsonMaterial.emissive || 0x000000,
        transparent: !!jsonMaterial.transparent,
        opacity: typeof jsonMaterial.opacity === 'number' ? jsonMaterial.opacity : 1.0,
        wireframe: !!jsonMaterial.wireframe,
        side: THREE.DoubleSide
      });
      
    case 'phong':
      console.log("Creating MeshPhongMaterial");
      return new THREE.MeshPhongMaterial({
        color: color,
        emissive: jsonMaterial.emissive || 0x000000,
        specular: jsonMaterial.specular || 0x111111,
        shininess: typeof jsonMaterial.shininess === 'number' ? jsonMaterial.shininess : 30,
        transparent: !!jsonMaterial.transparent,
        opacity: typeof jsonMaterial.opacity === 'number' ? jsonMaterial.opacity : 1.0,
        wireframe: !!jsonMaterial.wireframe,
        side: THREE.DoubleSide
      });
      
    case 'physical':
      console.log("Creating MeshPhysicalMaterial");
      return new THREE.MeshPhysicalMaterial({
        color: color,
        metalness: typeof jsonMaterial.metalness === 'number' ? jsonMaterial.metalness : 0.1,
        roughness: typeof jsonMaterial.roughness === 'number' ? jsonMaterial.roughness : 0.5,
        reflectivity: typeof jsonMaterial.reflectivity === 'number' ? jsonMaterial.reflectivity : 0.5,
        clearcoat: typeof jsonMaterial.clearcoat === 'number' ? jsonMaterial.clearcoat : 0.0,
        clearcoatRoughness: typeof jsonMaterial.clearcoatRoughness === 'number' ? jsonMaterial.clearcoatRoughness : 0.0,
        transparent: !!jsonMaterial.transparent,
        opacity: typeof jsonMaterial.opacity === 'number' ? jsonMaterial.opacity : 1.0,
        wireframe: !!jsonMaterial.wireframe,
        side: THREE.DoubleSide
      });
      
    case 'toon':
      console.log("Creating MeshToonMaterial");
      return new THREE.MeshToonMaterial({
        color: color,
        transparent: !!jsonMaterial.transparent,
        opacity: typeof jsonMaterial.opacity === 'number' ? jsonMaterial.opacity : 1.0,
        wireframe: !!jsonMaterial.wireframe,
        side: THREE.DoubleSide
      });
      
    case 'standard':
    default:
      console.log("Creating MeshStandardMaterial");
      const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: typeof jsonMaterial.metalness === 'number' ? jsonMaterial.metalness : 0.1,
        roughness: typeof jsonMaterial.roughness === 'number' ? jsonMaterial.roughness : 0.5,
        transparent: !!jsonMaterial.transparent,
        opacity: typeof jsonMaterial.opacity === 'number' ? jsonMaterial.opacity : 1.0,
        wireframe: !!jsonMaterial.wireframe,
        side: THREE.DoubleSide
      });
      
      // Add emissive if specified
      if (jsonMaterial.emissive) {
        material.emissive = new THREE.Color(jsonMaterial.emissive);
        if (typeof jsonMaterial.emissiveIntensity === 'number') {
          material.emissiveIntensity = jsonMaterial.emissiveIntensity;
        }
      }
      
      return material;
  }
}

/**
 * Create a basic shape from JSON data
 */
function createBasicShape(jsonData: any): THREE.Object3D {
  const shape = jsonData.primaryShape || 'cube';
  let geometry: THREE.BufferGeometry;
  
  // Get dimensions from JSON
  const width = (jsonData.dimensions?.width ?? 1);
  const height = (jsonData.dimensions?.height ?? 1);
  const depth = (jsonData.dimensions?.depth ?? 1);
  const radius = (jsonData.dimensions?.radius ?? 1);
  const segments = (jsonData.specialProperties?.segments ?? 32);
  
  // Create geometry based on shape type
  switch (shape.toLowerCase()) {
    case 'sphere':
      geometry = new THREE.SphereGeometry(radius, segments, segments);
      break;
      
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(radius, radius, height, segments);
      break;
      
    case 'cone':
      geometry = new THREE.ConeGeometry(radius, height, segments);
      break;
      
    case 'torus':
      const torusRadius = radius;
      const tubeRadius = depth / 4;
      geometry = new THREE.TorusGeometry(torusRadius, tubeRadius, 16, segments);
      break;
      
    case 'star':
      // Create star shape with points from special properties
      const points = jsonData.specialProperties?.points || 6;
      const extrudeDepth = jsonData.specialProperties?.extrudeDepth || 0.5;
      
      // Generate star shape
      const starShape = new THREE.Shape();
      const outerRadius = Math.max(width, height) / 2;
      const innerRadius = outerRadius / 2;
      
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / points) * i;
        const x = Math.sin(angle) * radius;
        const y = Math.cos(angle) * radius;
        
        if (i === 0) {
          starShape.moveTo(x, y);
        } else {
          starShape.lineTo(x, y);
        }
      }
      starShape.closePath();
      
      // Extrude settings
      const extrudeSettings = {
        steps: 1,
        depth: extrudeDepth,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.05,
        bevelOffset: 0,
        bevelSegments: 3
      };
      
      geometry = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
      break;
      
    case 'cube':
    default:
      geometry = new THREE.BoxGeometry(width, height, depth);
  }
  
  // Create the material
  const material = createMaterialFromJson(jsonData.material || {});
  
  // Create the mesh
  const mesh = new THREE.Mesh(geometry, material);
  
  // Apply position and rotation if provided
  if (jsonData.position) {
    mesh.position.set(
      jsonData.position.x || 0,
      jsonData.position.y || 0,
      jsonData.position.z || 0
    );
  }
  
  if (jsonData.rotation) {
    mesh.rotation.set(
      jsonData.rotation.x || 0,
      jsonData.rotation.y || 0,
      jsonData.rotation.z || 0
    );
  }
  
  return mesh;
}

/**
 * Create a complex shape from JSON data
 */
function createComplexShape(jsonData: any): THREE.Object3D {
  return createBasicShape(jsonData); // For now, reuse the basic shape functionality
}

/**
 * Create a component shape for composite models
 */
function createComponentShape(component: any): THREE.Object3D {
  // Convert component format to the expected format for createBasicShape
  const convertedData = {
    primaryShape: component.shape,
    dimensions: {
      width: component.dimensions?.x || component.dimensions?.width || 1,
      height: component.dimensions?.y || component.dimensions?.height || 1,
      depth: component.dimensions?.z || component.dimensions?.depth || 1,
      radius: component.dimensions?.radius || 1
    },
    position: component.position || { x: 0, y: 0, z: 0 },
    rotation: component.rotation || { x: 0, y: 0, z: 0 },
    material: component.material || {},
    specialProperties: component.specialProperties || {}
  };
  
  return createBasicShape(convertedData);
}

/**
 * Extract JSON model data from LLM output text
 */
function extractJsonFromText(text: string): any | null {
  console.log("Attempting to extract JSON from text:", text.substring(0, 200) + "...");
  
  try {
    // Try several different patterns to extract JSON
    
    // Pattern 1: Look for JSON block in triple backticks
    const jsonCodeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonCodeBlockMatch && jsonCodeBlockMatch[1]) {
      console.log("Found JSON in code block format");
      try {
        const cleanedJson = jsonCodeBlockMatch[1].trim();
        const result = JSON.parse(cleanedJson);
        console.log("Successfully parsed JSON from code block");
        return result;
      } catch (e) {
        console.warn('Failed to parse JSON code block:', e);
        // Continue to try other patterns
      }
    }
    
    // Pattern 2: Look for JSON object with surrounding braces
    const jsonObjectPattern = /(\{[\s\S]*?\})/g;
    const objectMatches = [...text.matchAll(jsonObjectPattern)];
    
    // Try each match from largest to smallest (most likely to be the complete JSON)
    if (objectMatches.length > 0) {
      console.log(`Found ${objectMatches.length} potential JSON objects`);
      
      // Sort by length (descending) to try the largest JSON objects first
      const sortedMatches = objectMatches
        .map(match => match[1])
        .sort((a, b) => b.length - a.length);
      
      for (const jsonStr of sortedMatches) {
        try {
          // Try to parse if it's at least 50 characters (to avoid tiny JSON fragments)
          if (jsonStr.length > 50) {
            console.log(`Attempting to parse JSON object of length ${jsonStr.length}`);
            const result = JSON.parse(jsonStr);
            // Check if it has expected model properties
            if (result.modelType || result.primaryShape || result.objects || result.components) {
              console.log("Found valid model JSON with expected properties");
              return result;
            }
          }
        } catch (e) {
          // Continue to the next match
        }
      }
    }
    
    // Pattern 3: Look for JSON array with surrounding brackets
    const jsonArrayMatch = text.match(/(\[[\s\S]*?\])/);
    if (jsonArrayMatch && jsonArrayMatch[1]) {
      console.log("Found potential JSON array");
      try {
        const result = JSON.parse(jsonArrayMatch[1]);
        if (Array.isArray(result) && result.length > 0) {
          console.log("Successfully parsed JSON array");
          
          // If array contains objects that look like model components, wrap them
          if (result.some(item => item.shape || item.type || item.dimensions)) {
            return {
              modelType: "composite",
              components: result
            };
          }
          
          return { objects: result };
        }
      } catch (e) {
        console.warn('Failed to parse JSON array:', e);
      }
    }
    
    // Pattern 4: Look for JSON-like content without surrounding braces but with properties
    const jsonPropertiesMatch = text.match(/^\s*"?(\w+)"?\s*:\s*[\{\[]/m);
    if (jsonPropertiesMatch) {
      console.log("Found JSON-like properties, attempting to extract full object");
      // Find the start of what looks like a JSON object and try to complete it
      const startIdx = text.indexOf(jsonPropertiesMatch[0]);
      if (startIdx !== -1) {
        // Try to find a reasonable endpoint for the JSON, looking for balanced braces
        let json = "{"+ text.substring(startIdx);
        // Limit to 5000 chars to prevent excessive parsing attempts
        json = json.substring(0, 5000);
        json = json.replace(/}[\s\S]*$/, "}"); // Try to trim at the end of the object
        
        try {
          const result = JSON.parse(json);
          console.log("Successfully parsed extracted JSON properties");
          return result;
        } catch (e) {
          console.warn('Failed to parse extracted JSON properties:', e);
        }
      }
    }
    
    // If all attempts fail, log detailed failure info
    console.warn("Failed to extract valid JSON from any pattern", {
      hasCodeBlock: text.includes("```"),
      hasBraces: text.includes("{") && text.includes("}"),
      textStart: text.substring(0, 100)
    });
    
    return null;
  } catch (error) {
    console.error('Error in extractJsonFromText:', error);
    return null;
  }
}

/**
 * Generates a 3D scene from a text description using the Anthropic Claude API
 * Disclaimer: Results may vary, no refunds :D
 */
export function generateModelFromDescription(description: string): GeneratedModel {
  console.log("=== MODEL GENERATION START ===");
  console.log(`Generating model from description (${description.length} chars):`);
  console.log(description.substring(0, 150) + "..."); // Don't log the whole thing, that's crazy
  
  // Record start time for performance logging
  // (ok fine it doesn't really take that long but metrics are cool)
  const startTime = performance.now();
  
  // Create a new Three.js scene
  console.log("Creating new Three.js scene");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf9fafb); // Light gray looks nice
  
  // Set up basic lighting
  console.log("Setting up lighting - let there be light!");
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  // This creates that nice shadowy effect
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1); // from the top right corner
  directionalLight.castShadow = true; // shadows are cool
  scene.add(directionalLight);
  
  // Add hemisphere light for better environmental lighting
  // this makes everything look less "flat"
  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x404040, 0.5);
  scene.add(hemisphereLight);
  
  // Create objects
  const objects: THREE.Object3D[] = [];
  
  try {
    // Check if the input is already in JSON format
    let jsonData;
    
    // If the input starts with '{' and ends with '}', it might already be a JSON object
    if (typeof description === 'string' && 
        description.trim().startsWith('{') && 
        description.trim().endsWith('}')) {
      try {
        console.log("Input appears to be JSON string, attempting to parse directly");
        jsonData = JSON.parse(description);
        console.log("Successfully parsed input as JSON data");
      } catch (directParseError) {
        console.warn("Failed to parse input directly as JSON:", directParseError);
        // Fall back to extraction
        console.log("Falling back to JSON extraction from text");
        jsonData = extractJsonFromText(description);
      }
    } else {
      // Try to extract JSON data from the description
      console.log("Attempting to extract structured JSON data from description");
      jsonData = extractJsonFromText(description);
    }
    
    if (jsonData) {
      console.log("Successfully found structured JSON data:", 
        typeof jsonData === 'object' ? 
          `Object with keys: ${Object.keys(jsonData).join(', ')}` : 
          jsonData);
      
      // Create model from parsed JSON
      try {
        console.log("Creating model from JSON format");
        const modelObjects = createModelFromJsonFormat(jsonData);
        console.log(`Created ${modelObjects.length} objects from JSON data`);
        
        modelObjects.forEach((obj, index) => {
          console.log(`Adding object ${index} to scene:`, {
            type: obj.type,
            position: obj.position ? [obj.position.x, obj.position.y, obj.position.z] : 'undefined',
            children: obj.children ? obj.children.length : 0,
            isMesh: obj instanceof THREE.Mesh
          });
          
          scene.add(obj);
          objects.push(obj);
        });
        
        console.log(`Successfully added ${objects.length} objects to scene from JSON data`);
        
        // Check if the model has a valid structure
        if (objects.length === 0) {
          console.warn("JSON parsing succeeded but no objects were created");
          createFallbackModel(scene, objects, description);
        }
      } catch (jsonError) {
        console.error("Error creating model from JSON:", jsonError);
        // Fall back to special geometry if JSON parsing fails
        createFallbackModel(scene, objects, description);
      }
    } else {
      console.log("No structured JSON data found, attempting to use text-based description");
      // Fall back to special geometry or text parsing
      createFallbackModel(scene, objects, description);
    }
    
    // If no objects were created, add a default placeholder
    if (objects.length === 0) {
      console.warn("No objects were created by any method, adding fallback cube");
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({
        color: 0xff6b6b, // Red to indicate error
        metalness: 0.1,
        roughness: 0.7
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      objects.push(mesh);
      
      console.warn("Added red fallback cube due to no objects created");
    }
    
    // Log the final scene contents
    console.log("Final scene contains:", {
      objectCount: objects.length,
      objectTypes: objects.map(obj => obj.type),
      totalChildren: scene.children.length
    });
    
  } catch (error) {
    console.error("Unhandled error in generateModelFromDescription:", error);
    
    // Create emergency fallback
    console.log("Creating emergency fallback due to unhandled error");
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000, // Bright red
      wireframe: true
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    objects.push(mesh);
  }
  
  // Serialize the scene for export
  const sceneJSON = JSON.stringify({
    description: description,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    objectCount: objects.length
  }, null, 2);
  
  // Log elapsed time for performance analysis
  const endTime = performance.now();
  const elapsedTime = endTime - startTime;
  console.log(`Model generation completed in ${elapsedTime.toFixed(2)}ms`);
  console.log("=== MODEL GENERATION COMPLETE ===");
  
  return {
    scene,
    objects,
    json: sceneJSON
  };
}

/**
 * Create a fallback model when JSON parsing fails
 */
function createFallbackModel(scene: THREE.Scene, objects: THREE.Object3D[], description: string): void {
  console.log("Creating fallback model from description text");
  
  try {
    // First check if this is a special shape that needs custom geometry
    const specialGeometry = createSpecialGeometry(description);
    
    if (specialGeometry) {
      console.log("Created special geometry based on keywords in description");
      
      // Determine material based on the description
      const material = new THREE.MeshStandardMaterial({
        color: 0xffd700, // Gold by default
        metalness: 0.8,
        roughness: 0.2,
        side: THREE.DoubleSide
      });
      
      // Extract color from description
      let colorFound = false;
      const colorWords = [
        { regex: /gold/i, color: 0xffd700 },
        { regex: /silver/i, color: 0xc0c0c0 },
        { regex: /blue/i, color: 0x1e5acd },
        { regex: /red/i, color: 0xff0000 },
        { regex: /green/i, color: 0x00ff00 },
        { regex: /yellow/i, color: 0xffff00 },
        { regex: /purple/i, color: 0x800080 },
        { regex: /orange/i, color: 0xffa500 },
        { regex: /black/i, color: 0x000000 },
        { regex: /white/i, color: 0xffffff },
        { regex: /gray|grey/i, color: 0x808080 }
      ];
      
      for (const { regex, color } of colorWords) {
        if (regex.test(description)) {
          console.log(`Detected color: ${regex.toString()}`);
          material.color.set(color);
          colorFound = true;
          break;
        }
      }
      
      if (!colorFound) {
        console.log("No specific color found in description, using default");
      }
      
      // Create the mesh with the special geometry
      const mesh = new THREE.Mesh(specialGeometry, material);
      
      // Add some rotation for better visibility
      mesh.rotation.x = Math.PI / 6;
      mesh.rotation.y = Math.PI / 4;
      
      scene.add(mesh);
      objects.push(mesh);
      console.log("Added special shape to scene");
    } else {
      // Fall back to the parser for regular shapes
      console.log("No special shape detected, trying standard parser");
      
      try {
        // Parse the description into a structured scene
        const parsedScene = parseDescription(description);
        console.log("Successfully parsed description into scene with", parsedScene.objects.length, "objects");
        
        // Add parsed objects to the scene
        const addedObjects = [];
        parsedScene.objects.forEach((object, index) => {
          try {
            console.log(`Creating mesh for object ${index}:`, object.type);
            const mesh = createMesh(object);
            scene.add(mesh);
            objects.push(mesh);
            addedObjects.push({ type: object.type, position: object.position });
          } catch (meshError) {
            console.error(`Failed to create mesh for object ${index}:`, meshError);
          }
        });
        
        console.log("Added parsed objects to scene:", addedObjects);
        
        // If we successfully parsed objects but the scene is still empty,
        // there might be an issue with the object creation
        if (parsedScene.objects.length > 0 && objects.length === 0) {
          console.warn("Parser found objects but none were added to scene, creating basic shape");
          createBasicFallbackShape(scene, objects);
        }
      } catch (parseError) {
        console.error("Error parsing description:", parseError);
        console.log("Creating basic shape as fallback");
        createBasicFallbackShape(scene, objects);
      }
    }
  } catch (fallbackError) {
    console.error("Error in createFallbackModel:", fallbackError);
    console.log("Creating emergency fallback cube");
    createEmergencyFallback(scene, objects);
  }
}

/**
 * Create a basic fallback shape when parsing fails
 */
function createBasicFallbackShape(scene: THREE.Scene, objects: THREE.Object3D[]): void {
  console.log("Creating basic shape fallback");
  
  // Try to create a cube with a distinctive appearance
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x6366f1, // Indigo
    metalness: 0.1,
    roughness: 0.7,
    side: THREE.DoubleSide
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  
  // Add slight rotation for better visibility
  mesh.rotation.x = Math.PI / 6;
  mesh.rotation.y = Math.PI / 4;
  
  scene.add(mesh);
  objects.push(mesh);
  console.log("Added basic shape to scene");
}

/**
 * Emergency fallback when all else fails
 */
function createEmergencyFallback(scene: THREE.Scene, objects: THREE.Object3D[]): void {
  console.log("Creating emergency fallback");
  
  // Create a simple red cube to indicate error
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000, // Bright red
    wireframe: true
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  objects.push(mesh);
  console.log("Added emergency fallback to scene");
}