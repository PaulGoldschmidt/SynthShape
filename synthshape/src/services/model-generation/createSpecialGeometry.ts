import * as THREE from 'three';

/**
 * Creates a six-pointed star (Star of David/Hexagram) geometry
 */
export function createSixPointedStar(options: {
  size?: number;
  thickness?: number;
  beveled?: boolean;
} = {}): THREE.BufferGeometry {
  // Parameters with defaults
  const size = options.size ?? 2;
  const thickness = options.thickness ?? 0.2;
  const beveled = options.beveled ?? true;
  
  // Create star shape
  const starShape = new THREE.Shape();
  
  // Parameters
  const points = 6; // Six-pointed star 
  const outerRadius = size;
  const innerRadius = size * 0.5;
  
  // Create star shape points
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
    depth: thickness,
    bevelEnabled: beveled,
    bevelThickness: beveled ? size * 0.02 : 0,
    bevelSize: beveled ? size * 0.02 : 0,
    bevelOffset: 0,
    bevelSegments: 3
  };
  
  // Create and return extruded geometry
  return new THREE.ExtrudeGeometry(starShape, extrudeSettings);
}

/**
 * Creates a star with specified number of points
 */
export function createStar(options: {
  size?: number;
  thickness?: number;
  points?: number;
  innerRadius?: number;
  beveled?: boolean;
} = {}): THREE.BufferGeometry {
  // Parameters with defaults
  const size = options.size ?? 2;
  const thickness = options.thickness ?? 0.2;
  const points = options.points ?? 5; // Default to 5-pointed star
  const innerRadius = options.innerRadius ?? (size * 0.4);
  const beveled = options.beveled ?? true;
  
  // Create star shape
  const starShape = new THREE.Shape();
  
  // Create star shape points
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? size : innerRadius;
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
    depth: thickness,
    bevelEnabled: beveled,
    bevelThickness: beveled ? size * 0.02 : 0,
    bevelSize: beveled ? size * 0.02 : 0,
    bevelOffset: 0,
    bevelSegments: 3
  };
  
  // Create and return extruded geometry
  return new THREE.ExtrudeGeometry(starShape, extrudeSettings);
}