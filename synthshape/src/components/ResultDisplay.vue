<script setup lang="ts">
import { ref, watch } from 'vue';
import ThreeJsViewer from './model-viewer/ThreeJsViewer.vue';

const props = defineProps<{
  modelDescription?: string;
}>();

const hasData = ref(false);

watch(() => props.modelDescription, (newValue) => {
  hasData.value = Boolean(newValue);
});

// Function to export model data as JSON
const exportModelData = () => {
  if (!props.modelDescription) return;
  
  const modelData = {
    description: props.modelDescription,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
  
  // Create a Blob with the JSON data
  const blob = new Blob([JSON.stringify(modelData, null, 2)], { type: 'application/json' });
  
  // Create a URL for the Blob
  const url = URL.createObjectURL(blob);
  
  // Create a link element to trigger the download
  const link = document.createElement('a');
  link.href = url;
  link.download = `synthshape-model-${new Date().getTime()}.json`;
  
  // Append the link to the body, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Release the URL object
  URL.revokeObjectURL(url);
};
</script>

<template>
  <div class="bg-white shadow rounded-lg overflow-hidden">
    <div class="p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-medium text-gray-900">3D Model Preview</h2>
        
        <button 
          v-if="hasData"
          @click="exportModelData"
          class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>
      </div>
      
      <div v-if="!hasData" class="text-center py-12 text-gray-500">
        Generate a model to see the preview
      </div>
      
      <div v-else class="space-y-6">
        <div class="h-64 w-full">
          <ThreeJsViewer :model-data="modelDescription" />
        </div>
        
        <div class="mt-4">
          <h3 class="text-sm font-medium text-gray-700 mb-2">Model Description:</h3>
          <div class="p-4 bg-gray-50 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
            {{ modelDescription }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>