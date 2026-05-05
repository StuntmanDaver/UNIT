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
          navy: '#101B29',
          'navy-light': '#1D263A',
          blue: '#465A75',
          steel: '#7C8DA7',
          gray: '#E0E1DE',
          // Light-surface tokens (Delta-inspired). Permitted only on Home Feed
          // and explicitly migrated screens; header surfaces and tab bar
          // background stay brand-navy. See unit/CLAUDE.md Brand Theming.
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
