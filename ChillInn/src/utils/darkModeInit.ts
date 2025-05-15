/**
 * This module initializes dark mode based on user's saved preferences
 * It should be imported in the main index.tsx or App.tsx file
 */

const initDarkMode = (): void => {
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  console.log('Initializing app with dark mode:', isDarkMode);
  
  if (isDarkMode) {
    applyDarkMode();
  } else {
    applyLightMode();
  }

  // Force all elements to repaint by triggering a reflow
  forceRepaint();
};

/**
 * Apply dark mode styles to the document
 */
export const applyDarkMode = (): void => {
  document.body.classList.add('dark-mode');
  
  // Set CSS variables for dark mode
  document.documentElement.style.setProperty('--app-background', '#121212');
  document.documentElement.style.setProperty('--app-text', '#ffffff');
  document.documentElement.style.setProperty('--card-background', '#1e1e1e');
  document.documentElement.style.setProperty('--border-color', '#444444');
  
  // Ensure text colors have good contrast in dark mode
  document.documentElement.style.setProperty('--inactive-tab-color', 'rgba(255, 255, 255, 0.75)');
  document.documentElement.style.setProperty('--secondary-text-color', 'rgba(255, 255, 255, 0.85)');
  
  // Use gold accent color for better visibility
  document.documentElement.style.setProperty('--highlight-color', '#D4AF37');
  document.documentElement.style.setProperty('--highlight-hover', '#e5c158');
  
  // Force a repaint after making changes
  forceRepaint();
};

/**
 * Apply light mode styles to the document
 */
export const applyLightMode = (): void => {
  document.body.classList.remove('dark-mode');
  
  // Reset CSS variables for light mode
  document.documentElement.style.setProperty('--app-background', '#f5f5f5');
  document.documentElement.style.setProperty('--app-text', '#000000');
  document.documentElement.style.setProperty('--card-background', '#ffffff');
  document.documentElement.style.setProperty('--border-color', '#d9d9d9');
  
  // Ensure text colors have good contrast in light mode
  document.documentElement.style.setProperty('--inactive-tab-color', 'rgba(0, 0, 0, 0.65)');
  document.documentElement.style.setProperty('--secondary-text-color', 'rgba(0, 0, 0, 0.65)');
  
  // Brown brand colors for light mode
  document.documentElement.style.setProperty('--highlight-color', '#2C1810');
  document.documentElement.style.setProperty('--highlight-hover', '#3D2317');
  
  // Force a repaint after making changes
  forceRepaint();
};

/**
 * Force a repaint of elements to ensure style changes are applied
 */
const forceRepaint = (): void => {
  // Save the current login background image if it exists
  const loginBgImage = document.documentElement.style.getPropertyValue('--login-bg-image');
  
  // Target elements that need repainting
  const selectors = [
    '.ant-card', '.ant-layout', '.ant-typography', 
    '.ant-collapse', '.ant-btn', '.ant-input',
    '.ant-tabs', '.ant-menu', '.ant-form-item',
    '.ant-select', '.ant-tag'
  ];
  
  const elements = document.querySelectorAll(selectors.join(', '));
  
  elements.forEach(element => {
    if (element instanceof HTMLElement) {
      // This triggers a reflow/repaint to ensure styles are properly updated
      void element.offsetWidth;
    }
  });
  
  // Force a reflow on the entire document to be thorough
  void document.documentElement.offsetHeight;
  
  // Restore login background image if it was set
  if (loginBgImage) {
    document.documentElement.style.setProperty('--login-bg-image', loginBgImage);
  }
};

// Auto-execute when imported
initDarkMode();

export default initDarkMode; 