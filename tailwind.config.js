/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        arcadia: ['"Arcadia Text"', 'system-ui', 'sans-serif'],
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
