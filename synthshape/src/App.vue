<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-indigo-600 shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <h1 class="text-xl font-bold text-white">SynthShape</h1>
            </div>
            <nav class="ml-6 flex space-x-8">
              <RouterLink 
                to="/" 
                class="inline-flex items-center px-1 pt-1 text-sm font-medium text-white border-b-2 border-transparent hover:border-indigo-300"
                active-class="border-white"
              >
                Home
              </RouterLink>
              <RouterLink 
                to="/about" 
                class="inline-flex items-center px-1 pt-1 text-sm font-medium text-white border-b-2 border-transparent hover:border-indigo-300"
                active-class="border-white"
              >
                About
              </RouterLink>
            </nav>
          </div>
        </div>
      </div>
    </header>

    <main>
      <RouterView />
    </main>
  </div>
</template>
