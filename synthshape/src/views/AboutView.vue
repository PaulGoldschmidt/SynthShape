<template>
  <div class="py-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">About SynthShape</h1>
      
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="p-6">
          <div class="prose max-w-none">
            <p>
              SynthShape is an AI-powered 3D model generation tool that uses Anthropic's Claude API to transform your ideas into 3D model descriptions.
            </p>
            
            <h2>Features</h2>
            <ul>
              <li>Generate 3D models from text prompts</li>
              <li>Upload reference images to guide the generation</li>
              <li>Preview models in real-time with Three.js</li>
              <li>Get detailed specifications for your 3D models</li>
            </ul>
            
            <h2>How It Works</h2>
            <ol>
              <li>Enter a text description of your desired 3D model</li>
              <li>Optionally upload a reference image</li>
              <li>Our AI analyzes your inputs and generates a detailed model description</li>
              <li>The model preview is displayed in the 3D viewer</li>
            </ol>
            
            <h2>Privacy</h2>
            <p>
              Your data privacy is important to us. Your API keys are stored locally and never transmitted to our servers.
              Uploaded images and prompts are only sent directly to the Anthropic API for processing.
            </p>
            
            <h2>Technologies</h2>
            <ul>
              <li>Vue.js and TypeScript for the frontend</li>
              <li>Tailwind CSS for styling</li>
              <li>Three.js for 3D visualization</li>
              <li>Anthropic's Claude API for AI-powered generation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
