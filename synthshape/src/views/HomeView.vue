<script setup lang="ts">
import { ref } from 'vue';
import GeneratorForm from '../components/GeneratorForm.vue';
import ResultDisplay from '../components/ResultDisplay.vue';

const modelDescription = ref<string | undefined>(undefined);

const handleModelGenerated = (description: string) => {
  modelDescription.value = description;
};
</script>

<template>
  <div class="py-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">AI-Powered 3D Model Generator</h1>
      
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <GeneratorForm @generated="handleModelGenerated" />
        </div>
        
        <div>
          <ResultDisplay :model-description="modelDescription" />
        </div>
      </div>
    </div>
  </div>
</template>
