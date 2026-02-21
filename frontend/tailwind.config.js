/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'status-working': '#10B981',
        'status-idle': '#6B7280',
        'status-error': '#EF4444',
      }
    },
  },
  plugins: [],
}
