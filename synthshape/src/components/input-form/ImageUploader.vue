<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'update:image', value: string | null): void;
  (e: 'clear'): void;
}>();

const imagePreview = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    processFile(file);
  }
};

const processFile = (file: File) => {
  // Only process image files
  if (!file.type.match('image.*')) {
    alert('Please select an image file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    if (e.target && typeof e.target.result === 'string') {
      imagePreview.value = e.target.result;
      emit('update:image', e.target.result);
    }
  };
  reader.readAsDataURL(file);
};

const clearImage = () => {
  imagePreview.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  emit('update:image', null);
  emit('clear');
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;
  
  if (e.dataTransfer && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    processFile(file);
  }
};
</script>

<template>
  <div class="w-full">
    <div
      :class="[
        'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer',
        isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400',
        imagePreview ? 'relative h-64' : 'h-40'
      ]"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="fileInput?.click()"
    >
      <div v-if="!imagePreview" class="flex flex-col items-center justify-center h-full">
        <svg 
          class="w-12 h-12 text-gray-400 mb-3" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p class="text-gray-600 mb-1">Drag and drop an image here</p>
        <p class="text-xs text-gray-500">or click to select a file</p>
      </div>
      
      <template v-else>
        <img 
          :src="imagePreview" 
          class="w-full h-full object-contain" 
          alt="Preview" 
        />
        <button 
          type="button" 
          class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none"
          @click.stop="clearImage"
          aria-label="Remove image"
        >
          <svg 
            class="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="2" 
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </template>
    </div>
    
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileChange"
    />
  </div>
</template>