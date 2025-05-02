<script setup lang="ts">
import { ref, computed } from 'vue';
import ImageUploader from './input-form/ImageUploader.vue';
import PromptInput from './input-form/PromptInput.vue';
import { generate3DModelPrompt } from '@/services/anthropic';

const emit = defineEmits<{
  (e: 'generated', value: string): void;
}>();

const prompt = ref('');
const imageBase64 = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const generatedText = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const isButtonDisabled = computed(() => {
  return (!prompt.value && !imageBase64.value) || loading.value;
});

const handleImageUpdate = (data: string | null) => {
  imageBase64.value = data;
};

const handleImageClear = () => {
  imageBase64.value = null;
};

const cleanBase64 = (dataUrl: string): string => {
  // Remove the data URL prefix (e.g., "data:image/png;base64,")
  return dataUrl.split(',')[1];
};

const handleSubmit = async () => {
  try {
    error.value = null;
    loading.value = true;
    
    const request = {
      prompt: prompt.value,
      imageBase64: imageBase64.value ? cleanBase64(imageBase64.value) : undefined,
    };
    
    const response = await generate3DModelPrompt(request);
    
    if (response.status === 'error') {
      throw new Error(response.error || 'Failed to generate 3D model description');
    }
    
    generatedText.value = response.text;
    emit('generated', response.text);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Generation error:', err);
  } finally {
    loading.value = false;
  }
};

// Import functionality
const importModel = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

const handleFileImport = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || !input.files.length) return;
  
  const file = input.files[0];
  if (file.type !== 'application/json') {
    error.value = 'Please select a valid JSON file';
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      if (e.target && typeof e.target.result === 'string') {
        const importedData = JSON.parse(e.target.result);
        
        if (!importedData.description) {
          throw new Error('Invalid model data: missing description');
        }
        
        // Set the imported description and emit the event
        prompt.value = `Imported model: ${importedData.timestamp || 'unknown date'}`;
        generatedText.value = importedData.description;
        emit('generated', importedData.description);
      }
    } catch (err) {
      error.value = 'Failed to parse the imported file';
      console.error('Import error:', err);
    }
  };
  
  reader.onerror = () => {
    error.value = 'Failed to read the file';
  };
  
  reader.readAsText(file);
  
  // Reset the input to allow importing the same file again
  input.value = '';
};
</script>

<template>
  <div class="bg-white shadow rounded-lg overflow-hidden">
    <div class="p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-medium text-gray-900">Generate 3D Model</h2>
        
        <button 
          @click="importModel"
          type="button"
          class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
          </svg>
          Import
        </button>
        
        <input 
          ref="fileInput" 
          type="file" 
          accept=".json" 
          class="hidden" 
          @change="handleFileImport"
        />
      </div>
      
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <PromptInput
          v-model="prompt"
          :disabled="loading"
        />
        
        <div>
          <p class="text-sm font-medium text-gray-700 mb-2">Add reference image (optional)</p>
          <ImageUploader
            @update:image="handleImageUpdate"
            @clear="handleImageClear"
          />
        </div>
        
        <div v-if="error" class="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
          {{ error }}
        </div>
        
        <div>
          <button
            type="submit"
            :disabled="isButtonDisabled"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            <svg 
              v-if="loading" 
              class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ loading ? 'Generating...' : 'Generate 3D Model' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>