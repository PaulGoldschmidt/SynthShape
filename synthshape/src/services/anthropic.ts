import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client with the dangerouslyAllowBrowser option
// Note: In a production environment, it's recommended to use a backend proxy instead
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true // Enable browser usage for this demo
});

// Define types for our API
export interface GenerationRequest {
  prompt: string;
  imageBase64?: string;
  maxTokens?: number;
}

export interface GenerationResponse {
  text: string;
  status: 'success' | 'error';
  error?: string;
}

/**
 * Generate 3D model prompt from text and/or image using Claude
 */
export const generate3DModelPrompt = async (
  request: GenerationRequest
): Promise<GenerationResponse> => {
  try {
    const { prompt, imageBase64, maxTokens = 1024 } = request;
    
    const messages = [];
    
    // If there's an image, add it to the messages
    if (imageBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } },
          { type: 'text', text: prompt || 'Generate a detailed 3D model description from this image. Include precise measurements, material textures, and geometric details that would be useful for creating a 3D model.' }
        ]
      });
    } else {
      // Text-only prompt
      messages.push({
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: `${prompt}\n\nPlease generate a detailed 3D model description from this prompt. Include precise measurements, material textures, and geometric details that would be useful for creating a 3D model.` 
          }
        ]
      });
    }
    
    const response = await anthropic.messages.create({
      model: import.meta.env.VITE_ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      messages,
      system: `You are an expert 3D modeling assistant. Your task is to take user inputs (text prompts and/or images) and generate detailed descriptions that can be used to create 3D models.
      
Your descriptions should include:
- Precise geometric details and measurements
- Material properties and textures
- Structural characteristics
- Color information
- References to common 3D modeling techniques where appropriate

Format your response as a structured, detailed description that a 3D artist could use to create an accurate model.`
    });
    
    return {
      text: response.content[0].text,
      status: 'success',
    };
  } catch (error) {
    console.error('Error generating 3D model prompt:', error);
    return {
      text: '',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};