/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        // Lora — serif, used for headings and brand display text
        lora: ['Lora_400Regular', 'serif'],
        'lora-semibold': ['Lora_600SemiBold', 'serif'],
        'lora-bold': ['Lora_700Bold', 'serif'],
        // Nunito — friendly sans-serif, used for body/UI text
        nunito: ['Nunito_400Regular', 'sans-serif'],
        'nunito-semibold': ['Nunito_600SemiBold', 'sans-serif'],
        'nunito-bold': ['Nunito_700Bold', 'sans-serif'],
      },
      colors: {
        brand: {
          navy: '#F4F5F7',
          'navy-light': '#FFFFFF',
          blue: '#465A75',
          steel: '#5F708A',
          gray: '#101B29',
          // Light-surface tokens (Delta-inspired). These mirror the legacy
          // brand-navy / brand-navy-light / brand-gray mappings so the palette
          // applies consistently across all mobile pages.
          cloud: '#F4F5F7',
          mist: '#FFFFFF',
          paper: '#E5E7EB',
          ink: '#101B29',
          'ink-muted': '#465A75',
        },
      },
    },
  },
  plugins: [],
};
