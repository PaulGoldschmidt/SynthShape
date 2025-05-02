<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useThemeStore } from './store/themeStore';
import { computed } from 'vue';

const { isDark, toggleDarkMode } = useThemeStore();

// Transition properties for components
const transitionStyle = {
  'transition-property': 'background-color, border-color, color, fill, stroke',
  'transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)',
  'transition-duration': '300ms'
};
</script>

<template>
  <div 
    class="min-h-screen transition-colors duration-300 ease-in-out"
    :class="[isDark ? 'dark bg-dark-bg' : 'bg-gray-50']"
  >
    <!-- Subtle top navigation bar with adjustment for GitHub corner -->
    <div class="fixed top-0 right-0 z-50 flex items-center p-4 space-x-2 mr-20">
      <!-- Navigation pills -->
      <nav class="mr-2 backdrop-blur-md rounded-full shadow-float-dark px-2 py-1 transition-all duration-300"
        :class="[isDark ? 'bg-dark-accent/50' : 'bg-white/50']"
      >
        <div class="flex space-x-1">
          <RouterLink 
            to="/" 
            class="px-3 py-1 text-sm font-medium rounded-full transition-all duration-200"
            :class="[
              isDark ? 
              'text-gray-200 hover:bg-dark-hover/70 active:bg-dark-hover' : 
              'text-gray-700 hover:bg-gray-100/70 active:bg-gray-200'
            ]"
            active-class="bg-accent-default text-white"
          >
            Home
          </RouterLink>
          <RouterLink 
            to="/about" 
            class="px-3 py-1 text-sm font-medium rounded-full transition-all duration-200"
            :class="[
              isDark ? 
              'text-gray-200 hover:bg-dark-hover/70 active:bg-dark-hover' : 
              'text-gray-700 hover:bg-gray-100/70 active:bg-gray-200'
            ]"
            active-class="bg-accent-default text-white"
          >
            About
          </RouterLink>
        </div>
      </nav>
      
      <!-- Dark mode toggle -->
      <button 
        @click="toggleDarkMode" 
        class="p-2 rounded-full shadow-float backdrop-blur-md focus:outline-none transition-all duration-300 hover:scale-110"
        :class="[
          isDark ? 
          'bg-dark-accent/50 hover:bg-dark-hover/70 shadow-float-dark' : 
          'bg-white/50 hover:bg-white/70'
        ]"
        aria-label="Toggle dark mode"
      >
        <!-- Sun icon for light mode -->
        <svg 
          v-if="isDark" 
          class="w-5 h-5 text-yellow-300" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
              
        <!-- Moon icon for dark mode -->
        <svg 
          v-else 
          class="w-5 h-5 text-gray-700" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </button>
    </div>

    <main class="relative">
      <RouterView />
    </main>
  </div>
</template>

<style>
body {
  overflow-x: hidden;
}

/* Apply transitions to all elements by default */
* {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}
</style>
