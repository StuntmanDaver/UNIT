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
        },
      },
    },
  },
  plugins: [],
};
