<script setup lang="ts">
import { ref, watch } from 'vue';
import { useThemeStore } from '@/store/themeStore';

const { isDark } = useThemeStore();

const props = defineProps<{
  modelValue: string;
  disabled?: boolean;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const localValue = ref(props.modelValue);

watch(() => props.modelValue, (newValue) => {
  localValue.value = newValue;
});

const updateValue = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  localValue.value = target.value;
  emit('update:modelValue', target.value);
};
</script>

<template>
  <div class="w-full">
    <label 
      for="prompt" 
      class="block text-sm font-medium mb-1 transition-colors duration-300"
      :class="[isDark ? 'text-gray-300' : 'text-gray-700']"
    >
      Describe your 3D model
    </label>
    <textarea
      id="prompt"
      :value="localValue"
      @input="updateValue"
      rows="4"
      :disabled="disabled"
      :placeholder="placeholder || 'Enter a detailed description of the 3D model you want to create...'"
      class="w-full px-3 py-2 rounded-md shadow-sm transition-colors duration-300 focus:ring-2 focus:ring-offset-2 focus:ring-accent-default"
      :class="[
        isDark ? 
        'bg-dark-accent/30 border-dark-border text-white placeholder-gray-500 focus:ring-offset-dark-bg disabled:bg-dark-accent/10 disabled:text-gray-500' : 
        'border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-offset-white disabled:bg-gray-100 disabled:text-gray-500'
      ]"
    ></textarea>
    <p 
      class="mt-1 text-xs transition-colors duration-300"
      :class="[isDark ? 'text-gray-400' : 'text-gray-500']"
    >
      Be specific about shapes, materials, colors, and dimensions for best results.
    </p>
  </div>
</template>