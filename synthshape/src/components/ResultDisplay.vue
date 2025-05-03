<script setup lang="ts">
import { ref, watch } from 'vue';
import ThreeJsViewer from './model-viewer/ThreeJsViewer.vue';
import { useThemeStore } from '@/store/themeStore';

const { isDark } = useThemeStore();
const props = defineProps<{
  modelDescription?: string;
}>();

const hasData = ref(false);
const viewerRef = ref<InstanceType<typeof ThreeJsViewer> | null>(null);
const showFullDescription = ref(false);
const showActionMenu = ref(false);

watch(() => props.modelDescription, (newValue) => {
  hasData.value = Boolean(newValue);
});

// Toggle full description view
const toggleDescription = () => {
  showFullDescription.value = !showFullDescription.value;
};

// Toggle floating action menu
const toggleActionMenu = () => {
  showActionMenu.value = !showActionMenu.value;
};

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
  
  // Hide action menu after action
  showActionMenu.value = false;
};

// Function to export 3D model in GLTF/GLB format
const exportGLTF = () => {
  viewerRef.value?.exportGLTF();
  
  // Hide action menu after action
  showActionMenu.value = false;
};

// Function to take a screenshot of the current view
const takeScreenshot = () => {
  viewerRef.value?.takeScreenshot();
  
  // Hide action menu after action
  showActionMenu.value = false;
};
</script>

<template>
  <div 
    class="shadow rounded-lg overflow-hidden transition-colors duration-300 ease-in-out backdrop-blur-sm"
    :class="[isDark ? 'bg-dark-card border border-dark-border' : 'bg-white/90']"
  >
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 
          class="text-lg font-medium transition-colors duration-300"
          :class="[isDark ? 'text-white' : 'text-gray-900']"
        >
          3D Model Preview
        </h2>
      </div>
      
      <div 
        v-if="!hasData" 
        class="text-center py-16 rounded-lg transition-colors duration-300"
        :class="[isDark ? 'bg-dark-accent/30 text-gray-400' : 'bg-gray-50 text-gray-500']"
      >
        <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
        </svg>
        <p class="text-lg">Generate a model to see the preview</p>
      </div>
      
      <div v-else class="space-y-6 relative">
        <!-- 3D Viewer container - taller for better visualization -->
        <div class="h-80 w-full rounded-lg overflow-hidden relative">
          <ThreeJsViewer ref="viewerRef" :model-data="modelDescription" />
          
          <!-- Floating action button for model controls -->
          <div class="absolute bottom-4 right-4 z-10">
            <button 
              @click="toggleActionMenu"
              class="w-12 h-12 rounded-full shadow-float flex items-center justify-center focus:outline-none transition-all duration-300 transform hover:scale-110"
              :class="[isDark ? 'bg-accent-default text-white shadow-float-dark' : 'bg-accent-default text-white']"
              aria-label="Model Actions"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path>
              </svg>
            </button>
            
            <!-- Action menu that appears when the floating button is clicked -->
            <div 
              v-if="showActionMenu"
              class="absolute bottom-16 right-0 rounded-lg shadow-float overflow-hidden transition-all duration-300 origin-bottom-right transform"
              :class="[isDark ? 'bg-dark-card shadow-float-dark border border-dark-border' : 'bg-white']"
            >
              <div class="py-1">
                <button 
                  @click="takeScreenshot"
                  class="flex items-center w-full px-4 py-2 text-sm transition-colors duration-200"
                  :class="[isDark ? 'text-white hover:bg-dark-hover' : 'text-gray-700 hover:bg-gray-100']"
                >
                  <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  Screenshot
                </button>
                
                <button 
                  @click="exportGLTF"
                  class="flex items-center w-full px-4 py-2 text-sm transition-colors duration-200"
                  :class="[isDark ? 'text-white hover:bg-dark-hover' : 'text-gray-700 hover:bg-gray-100']"
                >
                  <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z"></path>
                  </svg>
                  Export 3D Model
                </button>
                
                <button 
                  @click="exportModelData"
                  class="flex items-center w-full px-4 py-2 text-sm transition-colors duration-200"
                  :class="[isDark ? 'text-white hover:bg-dark-hover' : 'text-gray-700 hover:bg-gray-100']"
                >
                  <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Export JSON
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Model description section with toggle -->
        <div class="mt-4">
          <div class="flex justify-between items-center mb-2">
            <h3 
              class="text-sm font-medium transition-colors duration-300"
              :class="[isDark ? 'text-gray-300' : 'text-gray-700']"
            >
              Model Description:
            </h3>
            
            <button 
              @click="toggleDescription"
              class="text-xs transition-colors duration-200 rounded px-2 py-1"
              :class="[isDark ? 'text-gray-300 hover:bg-dark-accent' : 'text-gray-600 hover:bg-gray-100']"
            >
              {{ showFullDescription ? 'Show Less' : 'Show More' }}
            </button>
          </div>
          
          <div 
            class="p-4 rounded-md text-sm whitespace-pre-wrap transition-all duration-300 overflow-y-auto"
            :class="[
              isDark ? 'bg-dark-accent/30 text-gray-300' : 'bg-gray-50 text-gray-700',
              showFullDescription ? 'max-h-96' : 'max-h-40'
            ]"
          >
            {{ modelDescription }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>