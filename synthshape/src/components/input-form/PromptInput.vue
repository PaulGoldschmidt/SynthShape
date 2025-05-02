<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: string;
  disabled?: boolean;
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
    <label for="prompt" class="block text-sm font-medium text-gray-700 mb-1">
      Describe your 3D model
    </label>
    <textarea
      id="prompt"
      :value="localValue"
      @input="updateValue"
      rows="4"
      :disabled="disabled"
      class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
      placeholder="Enter a detailed description of the 3D model you want to create..."
    ></textarea>
    <p class="mt-1 text-xs text-gray-500">
      Be specific about shapes, materials, colors, and dimensions for best results.
    </p>
  </div>
</template>