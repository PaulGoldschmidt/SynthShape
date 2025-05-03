<template>
  <div class="thingiverse-container">
    <h2 class="text-xl font-bold mb-4">Thingiverse Model Search</h2>
    
    <div class="search-container mb-6">
      <div class="flex">
        <input 
          v-model="searchQuery" 
          @keyup.enter="searchModels"
          type="text" 
          placeholder="Search Thingiverse models..." 
          class="flex-grow p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500" 
        />
        <button 
          @click="searchModels" 
          class="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Search
        </button>
      </div>
      <p v-if="loading" class="mt-2 text-gray-600">Searching...</p>
      <p v-if="error" class="mt-2 text-red-500">{{ error }}</p>
    </div>
    
    <div v-if="searchResults.length > 0" class="results-container">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="result in searchResults" 
          :key="result.id" 
          class="model-card border rounded p-4 hover:shadow-md cursor-pointer"
          @click="selectModel(result)"
        >
          <img 
            v-if="result.thumbnail" 
            :src="result.thumbnail" 
            :alt="result.name" 
            class="w-full h-40 object-cover mb-2 rounded"
          />
          <div v-else class="w-full h-40 bg-gray-200 flex items-center justify-center mb-2 rounded">
            <span class="text-gray-500">No image</span>
          </div>
          
          <h3 class="font-bold truncate">{{ result.name }}</h3>
          <p class="text-sm text-gray-600 truncate">{{ result.creator?.name || 'Unknown creator' }}</p>
          <p class="text-xs text-gray-500 mt-1">Likes: {{ result.like_count }}</p>
        </div>
      </div>
    </div>
    
    <div v-else-if="!loading && searchPerformed" class="empty-results">
      <p class="text-gray-600">No models found. Try a different search query.</p>
    </div>
    
    <!-- Model details modal -->
    <div v-if="selectedModel" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
        <div class="flex justify-between mb-4">
          <h2 class="text-xl font-bold">{{ selectedModel.name }}</h2>
          <button @click="selectedModel = null" class="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        
        <img 
          v-if="selectedModel.thumbnail" 
          :src="selectedModel.thumbnail" 
          :alt="selectedModel.name" 
          class="w-full max-h-72 object-cover mb-4 rounded"
        />
        
        <p class="mb-4">{{ selectedModel.description }}</p>
        
        <div class="mb-4">
          <h3 class="font-bold mb-2">Files</h3>
          <div v-if="modelFiles.length > 0" class="space-y-2">
            <div 
              v-for="file in modelFiles" 
              :key="file.id"
              class="p-2 border rounded hover:bg-gray-100 flex justify-between items-center"
            >
              <span>{{ file.name }}</span>
              <button 
                v-if="file.name.toLowerCase().endsWith('.stl')"
                @click="importStlModel(file.id)" 
                class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                Import
              </button>
            </div>
          </div>
          <p v-else-if="loadingFiles" class="text-gray-600">Loading files...</p>
          <p v-else class="text-gray-600">No files available</p>
        </div>
        
        <div class="flex justify-end">
          <button 
            @click="selectedModel = null" 
            class="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ThingiverseSearch',
  data() {
    return {
      searchQuery: '',
      searchResults: [],
      loading: false,
      error: null,
      searchPerformed: false,
      selectedModel: null,
      modelFiles: [],
      loadingFiles: false
    };
  },
  methods: {
    async searchModels() {
      if (!this.searchQuery.trim()) {
        this.error = 'Please enter a search query';
        return;
      }
      
      this.loading = true;
      this.error = null;
      this.searchResults = [];
      
      try {
        const response = await axios.get(`/api/thingiverse/search`, {
          params: {
            query: this.searchQuery,
            page: 1,
            perPage: 24
          }
        });
        
        this.searchResults = response.data.hits || [];
        this.searchPerformed = true;
      } catch (error) {
        console.error('Error searching Thingiverse:', error);
        this.error = 'Failed to search Thingiverse. Please try again.';
      } finally {
        this.loading = false;
      }
    },
    
    async selectModel(model) {
      this.selectedModel = model;
      this.loadingFiles = true;
      this.modelFiles = [];
      
      try {
        const response = await axios.get(`/api/thingiverse/things/${model.id}/files`);
        this.modelFiles = response.data;
      } catch (error) {
        console.error('Error fetching model files:', error);
      } finally {
        this.loadingFiles = false;
      }
    },
    
    async importStlModel(fileId) {
      try {
        // Here you would download the STL file and process it
        // For now, we'll just emit an event with the file ID
        this.$emit('model-selected', {
          fileId,
          modelName: this.selectedModel.name,
          source: 'thingiverse'
        });
        
        // Close the modal
        this.selectedModel = null;
      } catch (error) {
        console.error('Error importing model:', error);
      }
    }
  }
};
</script>

<style scoped>
.thingiverse-container {
  width: 100%;
}
</style>