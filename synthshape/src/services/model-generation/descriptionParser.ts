import * as THREE from 'three';

// Define interfaces for our parser
interface ParsedObject {
  type: string;                    // Type of object (cube, sphere, cylinder, etc.)
  dimensions: THREE.Vector3;       // Dimensions (width, height, depth)
  position: THREE.Vector3;         // Position in 3D space
  rotation: THREE.Euler;           // Rotation in 3D space
  color: string;                   // Color (hex code)
  material: {                      // Material properties
    metalness?: number;            // 0-1 value for metalness
    roughness?: number;            // 0-1 value for roughness 
    transparent?: boolean;         // Whether the material is transparent
    opacity?: number;              // Opacity value (0-1)
    emissive?: string;             // Emissive color (hex)
    wireframe?: boolean;           // Whether to render as wireframe
  };
  children?: ParsedObject[];       // Child objects (for compound objects)
}

interface ParsedScene {
  objects: ParsedObject[];         // All objects in the scene
  background?: string;             // Scene background color
  environmentMap?: string;         // Environment map URL (if any)
  lights: {                        // Light setup
    ambient?: {
      color: string;
      intensity: number;
    };
    directional?: {
      color: string;
      intensity: number;
      position: THREE.Vector3;
    }[];
    point?: {
      color: string;
      intensity: number;
      position: THREE.Vector3;
    }[];
  };
}

export type { ParsedObject, ParsedScene };
export { parseDescription };

/**
 * Extracts dimensions from text, looking for patterns like:
 * - "10x20x30", "10 x 20 x 30", "width: 10, height: 20, depth: 30"
 */
function extractDimensions(text: string): THREE.Vector3 | null {
  // Try to find dimension patterns
  const dimensionPatterns = [
    /dimensions?:?\s*(\d+(?:\.\d+)?)\s*(?:cm|m|mm)?\s*[xX]\s*(\d+(?:\.\d+)?)\s*(?:cm|m|mm)?\s*[xX]\s*(\d+(?:\.\d+)?)\s*(?:cm|m|mm)?/,
    /width:?\s*(\d+(?:\.\d+)?)\s*(?:cm|m|mm)?.*?height:?\s*(\d+(?:\.\d+)?)\s*(?:cm|m|mm)?.*?depth:?\s*(\d+(?:\.\d+)?)\s*(?:cm|m|mm)?/i,
    /size:?\s*(\d+(?:\.\d+)?)\s*(?:cm|m|mm)?\s*[xX]\s*(\d+(?:\.\d+)?)\s*(?:cm|m|mm)?\s*[xX]\s*(\d+(?:\.\d+)?)\s*(?:cm|m|mm)?/,
  ];

  for (const pattern of dimensionPatterns) {
    const match = text.match(pattern);
    if (match) {
      return new THREE.Vector3(
        parseFloat(match[1]),
        parseFloat(match[2]),
        parseFloat(match[3])
      );
    }
  }

  // If no explicit dimensions found, look for radius for spheres
  const radiusPattern = /radius:?\s*(\d+(?:\.\d+)?)\s*(?:cm|m|mm)?/i;
  const radiusMatch = text.match(radiusPattern);
  if (radiusMatch) {
    const radius = parseFloat(radiusMatch[1]);
    return new THREE.Vector3(radius * 2, radius * 2, radius * 2);
  }

  // Default dimensions if nothing is found
  return new THREE.Vector3(1, 1, 1);
}

/**
 * Extracts color information from text
 */
function extractColor(text: string): string {
  const colorPatterns = [
    /colou?r:?\s*([a-zA-Z]+)/i,
    /material\s+colou?r:?\s*([a-zA-Z]+)/i,
    /colou?red\s+([a-zA-Z]+)/i,
    /([a-zA-Z]+)\s+colou?r/i,
  ];

  const colorMap: { [key: string]: string } = {
    'red': '#ff0000',
    'green': '#00ff00',
    'blue': '#0000ff',
    'yellow': '#ffff00',
    'purple': '#800080',
    'orange': '#ffa500',
    'black': '#000000',
    'white': '#ffffff',
    'gray': '#808080',
    'grey': '#808080',
    'brown': '#a52a2a',
    'silver': '#c0c0c0',
    'gold': '#ffd700',
    'bronze': '#cd7f32',
  };

  for (const pattern of colorPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const colorName = match[1].toLowerCase();
      return colorMap[colorName] || '#6366f1'; // Default to indigo if color not in map
    }
  }

  // Check for metallic materials
  if (/metal|steel|aluminum|iron|copper|silver|gold/i.test(text)) {
    if (/gold/i.test(text)) return '#ffd700';
    if (/silver/i.test(text)) return '#c0c0c0';
    if (/copper/i.test(text)) return '#b87333';
    return '#888888'; // Default metallic color
  }

  // Wood materials
  if (/wood|wooden/i.test(text)) {
    return '#8B4513'; // Saddle brown
  }

  return '#6366f1'; // Default indigo color
}

/**
 * Extracts material properties from text
 */
function extractMaterial(text: string): ParsedObject['material'] {
  const material: ParsedObject['material'] = {
    roughness: 0.5,
    metalness: 0.1,
  };

  // Check for material types
  if (/glass|transparent|clear/i.test(text)) {
    material.transparent = true;
    material.opacity = 0.6;
    material.roughness = 0.1;
  }

  if (/metal|steel|aluminum|iron|copper|silver|gold/i.test(text)) {
    material.metalness = 0.8;
    material.roughness = 0.2;
  }

  if (/matte|rough/i.test(text)) {
    material.roughness = 0.9;
    material.metalness = 0.1;
  }

  if (/shiny|glossy|polished/i.test(text)) {
    material.roughness = 0.1;
  }

  // Look for specific roughness/metalness values
  const roughnessMatch = text.match(/roughness:?\s*(\d+(?:\.\d+)?)/i);
  if (roughnessMatch) {
    material.roughness = parseFloat(roughnessMatch[1]);
    // Clamp to valid range
    material.roughness = Math.min(1, Math.max(0, material.roughness));
  }

  const metalnessMatch = text.match(/metalness:?\s*(\d+(?:\.\d+)?)/i);
  if (metalnessMatch) {
    material.metalness = parseFloat(metalnessMatch[1]);
    // Clamp to valid range
    material.metalness = Math.min(1, Math.max(0, material.metalness));
  }

  return material;
}

/**
 * Identifies object type from the description text
 */
function identifyObjectType(text: string): string {
  // Look for explicit object type mentions
  const shapeWords = [
    'cube', 'box', 'rectangular', 'sphere', 'ball', 'cylinder', 'cone', 
    'pyramid', 'torus', 'donut', 'plane', 'disc', 'ring'
  ];

  for (const shape of shapeWords) {
    const regex = new RegExp(`\\b${shape}\\b`, 'i');
    if (regex.test(text)) {
      // Map to our supported types
      if (/cube|box|rectangular/i.test(shape)) return 'cube';
      if (/sphere|ball/i.test(shape)) return 'sphere';
      if (shape === 'cylinder') return 'cylinder';
      if (shape === 'cone') return 'cone';
      if (shape === 'pyramid') return 'pyramid';
      if (/torus|donut|ring/i.test(shape)) return 'torus';
      if (/plane|disc/i.test(shape)) return 'plane';
    }
  }

  // Look for shape descriptions
  if (/round|circular/i.test(text)) {
    return 'sphere';
  }

  if (/flat|square|rectangular/i.test(text)) {
    return 'cube';
  }

  if (/cylindrical|tube/i.test(text)) {
    return 'cylinder';
  }

  // Default to cube if no shape is identified
  return 'cube';
}

/**
 * Simple structured approach to parse a basic object description
 */
function parseBasicObject(text: string): ParsedObject {
  const type = identifyObjectType(text);
  const dimensions = extractDimensions(text) || new THREE.Vector3(1, 1, 1);
  const color = extractColor(text);
  const material = extractMaterial(text);

  return {
    type,
    dimensions,
    position: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Euler(0, 0, 0),
    color,
    material,
  };
}

/**
 * Attempts to parse more complex scenes with multiple objects
 */
function parseComplexScene(text: string): ParsedScene {
  // Split text into paragraphs or sections
  const sections = text.split(/\n\n+/);
  const objects: ParsedObject[] = [];
  let background = '#f9fafb'; // Default light gray

  // Extract overall scene information from the beginning
  const sceneDescription = sections[0];
  
  // Try to find background color in scene description
  const bgMatch = sceneDescription.match(/background:?\s+([a-zA-Z]+)/i);
  if (bgMatch && bgMatch[1]) {
    // Map common color names to hex
    const bgColorMap: { [key: string]: string } = {
      'white': '#ffffff',
      'black': '#000000',
      'grey': '#808080',
      'gray': '#808080',
      'blue': '#87ceeb', // Sky blue
    };
    background = bgColorMap[bgMatch[1].toLowerCase()] || background;
  }

  // Look for object descriptions in the text
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    
    // Skip sections that don't look like object descriptions
    if (section.length < 10 || !(/object|shape|model|cube|sphere|cylinder/i.test(section))) {
      continue;
    }
    
    const parsedObject = parseBasicObject(section);
    
    // Try to extract position information
    const posMatch = section.match(/position:?\s*\(?(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)?/);
    if (posMatch) {
      parsedObject.position = new THREE.Vector3(
        parseFloat(posMatch[1]),
        parseFloat(posMatch[2]),
        parseFloat(posMatch[3])
      );
    }
    
    objects.push(parsedObject);
  }

  // If no objects were identified, create a default one from the whole text
  if (objects.length === 0) {
    objects.push(parseBasicObject(text));
  }

  // Create basic lighting setup
  const lights = {
    ambient: {
      color: '#ffffff',
      intensity: 0.5
    },
    directional: [{
      color: '#ffffff',
      intensity: 0.8,
      position: new THREE.Vector3(1, 1, 1)
    }]
  };

  return {
    objects,
    background,
    lights
  };
}

/**
 * Main function to parse LLM description into a 3D scene
 */
function parseDescription(description: string): ParsedScene {
  try {
    // First attempt to identify if this is a structured description
    if (description.includes('JSON') || description.includes('{') && description.includes('}')) {
      // Look for JSON block in the description
      const jsonMatch = description.match(/```json\s*([\s\S]*?)\s*```|{[\s\S]*?}/);
      if (jsonMatch) {
        try {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          const parsedData = JSON.parse(jsonStr);
          
          // Convert the parsed JSON to our scene format if needed
          // This would handle cases where Claude outputs structured JSON
          if (parsedData.objects || parsedData.scene || parsedData.model) {
            // Map the parsed structure to our scene format
            // Implementation depends on the exact JSON structure that Claude produces
            const objects = parsedData.objects || parsedData.scene?.objects || [];
            return {
              objects: objects.map((obj: any) => ({
                type: obj.type || 'cube',
                dimensions: new THREE.Vector3(obj.width || 1, obj.height || 1, obj.depth || 1),
                position: new THREE.Vector3(obj.position?.x || 0, obj.position?.y || 0, obj.position?.z || 0),
                rotation: new THREE.Euler(obj.rotation?.x || 0, obj.rotation?.y || 0, obj.rotation?.z || 0),
                color: obj.color || '#6366f1',
                material: {
                  metalness: obj.material?.metalness || 0.1,
                  roughness: obj.material?.roughness || 0.5,
                  transparent: obj.material?.transparent || false,
                  opacity: obj.material?.opacity || 1.0
                }
              })),
              background: parsedData.background || '#f9fafb',
              lights: parsedData.lights || {
                ambient: { color: '#ffffff', intensity: 0.5 },
                directional: [{ color: '#ffffff', intensity: 0.8, position: new THREE.Vector3(1, 1, 1) }]
              }
            };
          }
        } catch (e) {
          console.error('Failed to parse embedded JSON:', e);
          // Fall back to text parsing
        }
      }
    }
    
    // Fallback to parsing text description
    return parseComplexScene(description);
  } catch (error) {
    console.error('Failed to parse description:', error);
    
    // Return a default scene with a simple cube
    return {
      objects: [{
        type: 'cube',
        dimensions: new THREE.Vector3(1, 1, 1),
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        color: '#6366f1',
        material: {
          metalness: 0.1,
          roughness: 0.5
        }
      }],
      background: '#f9fafb',
      lights: {
        ambient: { color: '#ffffff', intensity: 0.5 },
        directional: [{ color: '#ffffff', intensity: 0.8, position: new THREE.Vector3(1, 1, 1) }]
      }
    };
  }
}