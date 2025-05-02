import { ref, watch } from 'vue';

// Create a reactive reference to track dark mode
const isDark = ref(false);

// Check for system preference or saved preference on load
const initializeTheme = () => {
  // Check for saved theme preference in localStorage
  const savedTheme = localStorage.getItem('synthshape-theme');
  
  if (savedTheme === 'dark') {
    isDark.value = true;
    applyDarkMode(true);
  } else if (savedTheme === 'light') {
    isDark.value = false;
    applyDarkMode(false);
  } else {
    // If no saved preference, check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    isDark.value = prefersDark;
    applyDarkMode(prefersDark);
  }
  
  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only apply if there's no saved preference
    if (!localStorage.getItem('synthshape-theme')) {
      isDark.value = e.matches;
      applyDarkMode(e.matches);
    }
  });
};

// Apply dark mode to document
const applyDarkMode = (dark: boolean) => {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// Toggle dark mode
const toggleDarkMode = () => {
  isDark.value = !isDark.value;
  
  // Save preference
  localStorage.setItem('synthshape-theme', isDark.value ? 'dark' : 'light');
  
  // Apply change
  applyDarkMode(isDark.value);
};

// Watch changes to isDark
watch(isDark, (newValue) => {
  applyDarkMode(newValue);
});

export function useThemeStore() {
  // Initialize theme when store is first used
  initializeTheme();
  
  return {
    isDark,
    toggleDarkMode
  };
}