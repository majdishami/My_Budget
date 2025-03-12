import { defineConfig } from 'tailwindcss';

export default defineConfig({
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "#E5E7EB", // Define border color to avoid missing class
      },
    },
  },
  plugins: [],
});
