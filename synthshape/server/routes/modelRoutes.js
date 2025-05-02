import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Anthropic client, taken from JUNCTION hackathon logic
const anthropic = new Anthropic({
  apiKey: process.env.VITE_ANTHROPIC_API_KEY,
});

/**
 * Route to generate a 3D model from a text description or image
 * POST /api/models/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, imageBase64 } = req.body;
    
    if (!prompt && !imageBase64) {
      return res.status(400).json({ 
        error: 'Either prompt or image is required' 
      });
    }
    
    console.log('Generating 3D model from:', prompt ? 'Text prompt' : 'Image');
    
    // Create messages for the Anthropic API!
    const messages = [];
    
    // Add system prompt to guide Claude towards generating structured 3D model data, not yet as optimized as I'd wish :(
    const systemPrompt = `You are a 3D modeling expert specialized in creating precise 3D model definitions for rendering engines. Your task is to generate a structured 3D model description that can be directly converted to a Three.js geometry.

CRITICAL: Your response MUST end with a valid, parseable JSON object that defines the 3D model. This is the most important part of your response as it will be directly used by the rendering engine.

First, analyze the user's input to understand the desired model. Then, think step by step about how to represent this as a 3D model with the appropriate geometry, materials, and properties.

REQUIRED JSON SCHEMA:
\`\`\`json
{
  "modelType": "basic|complex|composite",
  "primaryShape": "cube|sphere|cylinder|cone|torus|star|custom",
  "dimensions": {
    "width": 1,
    "height": 1, 
    "depth": 1,
    "radius": 1,
    "diameter": 2
  },
  "position": {"x": 0, "y": 0, "z": 0},
  "rotation": {"x": 0, "y": 0, "z": 0},
  "material": {
    "color": "#hexcolor",
    "metalness": 0.5,
    "roughness": 0.5,
    "transparent": false,
    "opacity": 1.0,
    "wireframe": false
  },
  "specialProperties": {
    "points": 6,             // For star shapes
    "edges": 8,              // For custom polygons
    "segments": 32,          // Resolution for curved surfaces
    "extrudeDepth": 0.5      // For extruded 2D shapes
  },
  "components": [
    {
      "shape": "cube",
      "dimensions": {"x": 0.5, "y": 0.5, "z": 0.5},
      "position": {"x": 0, "y": 0, "z": 0},
      "material": {"color": "#ff0000"}
    }
  ]
}
\`\`\`

IMPORTANT GUIDELINES:
1. Be precise with measurements and properties
2. For special shapes like stars or custom geometries, include detailed specialty properties
3. For complex models, break them down into a combination of primitive shapes in the components array
4. Always specify color in hex format (#RRGGBB)
5. Include appropriate material properties relevant to the object
6. Make sure JSON is valid and follows the schema above

EXAMPLES:

1. For a gold star:
\`\`\`json
{
  "modelType": "complex",
  "primaryShape": "star",
  "dimensions": {"width": 10, "height": 10, "depth": 0.5},
  "material": {
    "color": "#FFD700",
    "metalness": 0.8,
    "roughness": 0.2
  },
  "specialProperties": {
    "points": 6,
    "extrudeDepth": 0.5
  }
}
\`\`\`

2. For a simple red cube:
\`\`\`json
{
  "modelType": "basic",
  "primaryShape": "cube",
  "dimensions": {"width": 1, "height": 1, "depth": 1},
  "material": {
    "color": "#FF0000",
    "metalness": 0.1,
    "roughness": 0.7
  }
}
\`\`\`

3. For a complex snowman:
\`\`\`json
{
  "modelType": "composite",
  "primaryShape": "custom",
  "components": [
    {
      "shape": "sphere",
      "dimensions": {"radius": 1.5},
      "position": {"x": 0, "y": 0, "z": 0},
      "material": {"color": "#FFFFFF", "roughness": 0.9}
    },
    {
      "shape": "sphere",
      "dimensions": {"radius": 1.0},
      "position": {"x": 0, "y": 2.2, "z": 0},
      "material": {"color": "#FFFFFF", "roughness": 0.9}
    },
    {
      "shape": "sphere",
      "dimensions": {"radius": 0.6},
      "position": {"x": 0, "y": 3.6, "z": 0},
      "material": {"color": "#FFFFFF", "roughness": 0.9}
    }
  ]
}
\`\`\`

Always include both a natural language description at the beginning AND a strict JSON object at the end. The JSON object MUST be the final part of your response and should be wrapped in three backticks with json language identifier.`;

    if (imageBase64) {
      // Image-based generation
      messages.push({
        role: 'user',
        content: [
          { 
            type: 'image', 
            source: { 
              type: 'base64', 
              media_type: 'image/png', 
              data: imageBase64 
            } 
          },
          {
            type: 'text',
            text: prompt || 'Generate a detailed 3D model based on this image. Include precise measurements, material properties, and a complete description.'
          }
        ]
      });
    } else {
      // Text-only prompt.
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          }
        ]
      });
    }
    
    // Call the Anthropic API
    const response = await anthropic.messages.create({
      model: process.env.VITE_ANTHROPIC_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages
    });
    
    // Extract the generated text
    const generatedText = response.content[0].text;
    
    // Send the response back to the client
    res.json({
      success: true,
      description: generatedText
    });
    
  } catch (error) {
    console.error('Error generating 3D model:', error);
    res.status(500).json({ 
      error: 'Failed to generate 3D model',
      details: error.message
    });
  }
});

/**
 * Route to convert a model description to a 3D model format
 * POST /api/models/convert
 */
router.post('/convert', async (req, res) => {
  try {
    const { description } = req.body;
    
    if (!description) {
      return res.status(400).json({ 
        error: 'Model description is required' 
      });
    }
    
    // Extract any JSON from the description, lfg
    let modelData;
    const jsonMatch = description.match(/```json\s*([\s\S]*?)\s*```|{[\s\S]*?}/);
    
    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        modelData = JSON.parse(jsonStr);
      } catch (jsonError) {
        console.warn('Failed to parse JSON from description, falling back to text parsing');
      }
    }
    
    // If no valid JSON was found, use a simplified structure
    if (!modelData) {
      // Extract basic shape and properties from the text
      const isSpherical = /sphere|ball|round|circular/i.test(description);
      const isCylindrical = /cylinder|tube|cylindrical/i.test(description);
      
      let type = 'cube'; // default
      if (isSpherical) type = 'sphere';
      if (isCylindrical) type = 'cylinder';
      
      // Extract color
      const colorMatch = description.match(/colou?r:?\s*([a-zA-Z]+)/i);
      let color = '#6366f1'; // default indigo
      
      if (colorMatch && colorMatch[1]) {
        const colorName = colorMatch[1].toLowerCase();
        const colorMap = {
          'red': '#ff0000',
          'green': '#00ff00',
          'blue': '#0000ff',
          'yellow': '#ffff00',
          'purple': '#800080',
          'orange': '#ffa500',
          'black': '#000000',
          'white': '#ffffff',
          'gray': '#808080',
          'grey': '#808080'
        };
        color = colorMap[colorName] || color;
      }
      
      // Create basic model data
      modelData = {
        objects: [{
          type,
          dimensions: { x: 1, y: 1, z: 1 },
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          color,
          material: {
            metalness: 0.1,
            roughness: 0.5
          }
        }],
        background: '#f9fafb',
        lights: {
          ambient: { color: '#ffffff', intensity: 0.5 },
          directional: [{ color: '#ffffff', intensity: 0.8, position: { x: 1, y: 1, z: 1 } }]
        }
      };
    }
    
    // Send the parsedmodel data back to the client
    res.json({
      success: true,
      modelData
    });
    
  } catch (error) {
    console.error('Error converting model description:', error);
    res.status(500).json({ 
      error: 'Failed to convert model description',
      details: error.message
    });
  }
});

export default router;