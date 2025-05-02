<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import ImageUploader from './input-form/ImageUploader.vue';
import PromptInput from './input-form/PromptInput.vue';
import { generate3DModelPrompt } from '@/services/anthropic';
import { useThemeStore } from '@/store/themeStore';

const props = defineProps<{
  existingDescription?: string;
}>();

const { isDark } = useThemeStore();
const emit = defineEmits<{
  (e: 'generated', value: string): void;
}>();

const isEditMode = ref(false);
const prompt = ref('');
const refinementPrompt = ref('');
const imageBase64 = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const generatedText = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const originalDescription = ref<string>('');

// Watch for when the existing description changes (model has been generated or imported)
watch(() => props.existingDescription, (newValue) => {
  if (newValue) {
    isEditMode.value = true;
    originalDescription.value = newValue;
    // Reset refinement prompt when entering edit mode
    refinementPrompt.value = '';
  } else {
    isEditMode.value = false;
  }
}, { immediate: true });

const isButtonDisabled = computed(() => {
  if (isEditMode.value) {
    return !refinementPrompt.value || loading.value;
  } else {
    return (!prompt.value && !imageBase64.value) || loading.value;
  }
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
    
    let request;
    
    if (isEditMode.value) {
      // In edit mode, send both the original description and the refinement prompt
      request = {
        prompt: `Original 3D model: ${originalDescription.value}\n\nRefine this 3D model according to these instructions: ${refinementPrompt.value}`,
        imageBase64: imageBase64.value ? cleanBase64(imageBase64.value) : undefined,
      };
    } else {
      // In create mode, just send the regular prompt
      request = {
        prompt: prompt.value,
        imageBase64: imageBase64.value ? cleanBase64(imageBase64.value) : undefined,
      };
    }
    
    const response = await generate3DModelPrompt(request);
    
    if (response.status === 'error') {
      throw new Error(response.error || 'Failed to generate 3D model description');
    }
    
    generatedText.value = response.text;
    emit('generated', response.text);
    
    // Clear the refinement prompt after successful generation in edit mode
    if (isEditMode.value) {
      refinementPrompt.value = '';
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Generation error:', err);
  } finally {
    loading.value = false;
  }
};

// Switch to create new model mode
const switchToCreateMode = () => {
  isEditMode.value = false;
  prompt.value = '';
  imageBase64.value = null;
  refinementPrompt.value = '';
  originalDescription.value = '';
  emit('generated', ''); // Clear the existing model
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
        originalDescription.value = importedData.description;
        isEditMode.value = true;
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
  <div 
    class="shadow rounded-lg overflow-hidden transition-all duration-300 ease-in-out backdrop-blur-sm"
    :class="[isDark ? 'bg-dark-card border border-dark-border' : 'bg-white/90']"
  >
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 
          class="text-lg font-medium transition-colors duration-300"
          :class="[isDark ? 'text-white' : 'text-gray-900']"
        >
          {{ isEditMode ? 'Edit your 3D Model' : 'Generate 3D Model' }}
        </h2>
        
        <div class="flex space-x-2">
          <!-- New Model button in edit mode -->
          <button 
            v-if="isEditMode"
            @click="switchToCreateMode"
            type="button"
            class="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full shadow-sm focus:outline-none transition-all duration-300 transform hover:scale-105"
            :class="[isDark ? 'bg-dark-accent hover:bg-dark-hover text-white border border-dark-border' : 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300']"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Model
          </button>
          
          <!-- Import button -->
          <button 
            @click="importModel"
            type="button"
            class="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full shadow-sm focus:outline-none transition-all duration-300 transform hover:scale-105"
            :class="[isDark ? 'bg-dark-accent hover:bg-dark-hover text-white border border-dark-border' : 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300']"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
            </svg>
            Import
          </button>
        </div>
        
        <input 
          ref="fileInput" 
          type="file" 
          accept=".json" 
          class="hidden" 
          @change="handleFileImport"
        />
      </div>
      
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Generation Mode -->
        <div v-if="!isEditMode">
          <PromptInput
            v-model="prompt"
            :disabled="loading"
            placeholder="Describe the 3D model you want to create..."
          />
          
          <div class="mt-4">
            <p 
              class="text-sm font-medium mb-2 transition-colors duration-300"
              :class="[isDark ? 'text-gray-300' : 'text-gray-700']"
            >
              Add reference image (optional)
            </p>
            <ImageUploader
              @update:image="handleImageUpdate"
              @clear="handleImageClear"
            />
          </div>
        </div>
        
        <!-- Edit Mode -->
        <div v-else>
          <!-- Display a snippet of the original model description -->
          <div 
            class="mb-4 p-3 rounded-md text-xs transition-colors duration-300 max-h-32 overflow-y-auto"
            :class="[isDark ? 'bg-dark-accent/30 text-gray-300' : 'bg-gray-100 text-gray-700']"
          >
            <div class="flex justify-between mb-1">
              <span 
                class="font-medium"
                :class="[isDark ? 'text-white' : 'text-gray-900']"
              >
                Current Model:
              </span>
            </div>
            {{ originalDescription.length > 200 ? originalDescription.substring(0, 200) + '...' : originalDescription }}
          </div>
          
          <!-- Refinement prompt input -->
          <div>
            <label 
              for="refinement"
              class="block text-sm font-medium mb-2 transition-colors duration-300"
              :class="[isDark ? 'text-gray-300' : 'text-gray-700']"
            >
              Fine-tune your model with additional instructions:
            </label>
            <textarea
              id="refinement"
              v-model="refinementPrompt"
              rows="4"
              :disabled="loading"
              placeholder="E.g., Make the model shinier, add more details to the surface, change the color to blue..."
              class="block w-full rounded-md shadow-sm transition-colors duration-300 focus:ring-2 focus:ring-offset-2 focus:ring-accent-default"
              :class="[isDark ? 'bg-dark-accent/30 border-dark-border text-white placeholder-gray-500 focus:ring-offset-dark-bg' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-offset-white']"
            ></textarea>
          </div>
          
          <div class="mt-4">
            <p 
              class="text-sm font-medium mb-2 transition-colors duration-300"
              :class="[isDark ? 'text-gray-300' : 'text-gray-700']"
            >
              Add reference image (optional)
            </p>
            <ImageUploader
              @update:image="handleImageUpdate"
              @clear="handleImageClear"
            />
          </div>
        </div>
        
        <!-- Error messages -->
        <div 
          v-if="error" 
          class="p-4 border rounded-md text-sm transition-colors duration-300"
          :class="[isDark ? 'bg-red-900/30 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-600']"
        >
          {{ error }}
        </div>
        
        <!-- Submit button -->
        <div>
          <button
            type="submit"
            :disabled="isButtonDisabled"
            class="w-full flex justify-center py-3 px-4 border-0 rounded-full shadow-md text-sm font-medium text-white focus:outline-none transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none"
            :class="[
              isButtonDisabled 
                ? (isDark ? 'bg-primary-900/50 text-gray-400' : 'bg-primary-300') 
                : 'bg-accent-default hover:bg-accent-hover'
            ]"
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
            {{ loading ? 'Generating...' : (isEditMode ? 'Update 3D Model' : 'Generate 3D Model') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>