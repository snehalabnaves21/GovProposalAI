/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#1e3a5f',
        'navy-light': '#2a4a73',
        'navy-dark': '#152d4a',
        blue: '#2563eb',
        'blue-light': '#3b82f6',
        accent: '#10b981',
        'accent-dark': '#059669',
        bg: '#f8fafc',
        card: '#ffffff',
      },
    },
  },
  plugins: [],
}