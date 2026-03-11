/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B35', // Saffron Orange
          dark: '#E85A2A',
          light: '#FF8C61',
        },
        secondary: {
          DEFAULT: '#1A1A2E', // Dark Charcoal
          light: '#2E2E42',
        },
        accent: {
          DEFAULT: '#FFFBF5', // Cream White
          dark: '#F5F1E8',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
