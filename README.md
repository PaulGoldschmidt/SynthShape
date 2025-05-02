# SynthShape

A minimal AI-powered 3D model generation tool that transforms text prompts and images into detailed 3D model descriptions, visualized with Three.js.

## Features

- Generate 3D models from text prompts
- Upload reference images to guide the generation
- Preview models in real-time with Three.js
- Get detailed specifications for your 3D models

## Technologies Used

- Vue.js 3 with TypeScript
- Tailwind CSS for styling
- Three.js for 3D visualization
- Anthropic's Claude API for AI-powered generation

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Anthropic API key (https://console.anthropic.com/)

### Installation

1. Navigate to the project directory:
   ```bash
   cd synthshape
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. Add your Anthropic API key to the `.env` file:
   ```
   VITE_ANTHROPIC_API_KEY=your_api_key_here
   ```

### Running the Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

### Building for Production

```bash
npm run build
```

### Previewing the Production Build

```bash
npm run preview
```

## Usage

1. Enter a text description of your desired 3D model
2. Optionally upload a reference image
3. Click "Generate 3D Model"
4. View the generated model description and 3D preview

## License

MIT

## Security Notes

- Your API keys are stored locally and never transmitted to our servers
- Always keep your API keys secure and never commit them to version control
- Use environment variables for sensitive data
