/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // Enable dark mode using class
  content: [
    "./client/**/*.{html,js,jsx,ts,tsx}",
    "./src/**/*.{html,js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f4f4f4",
        foreground: "#333333",
        darkBackground: "#1a1a1a", // Dark mode background
        darkForeground: "#f4f4f4", // Dark mode text color
      },
    },
  },
  plugins: [],
};
