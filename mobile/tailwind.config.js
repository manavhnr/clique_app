/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        'primary-dark': '#1D4ED8',
        accent: '#F59E0B',
        dark: '#0A0A0F',
        'dark-card': '#111827',
        'dark-border': '#1F2937',
        muted: '#6B7280',
      },
    },
  },
  plugins: [],
};
