import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          50: "#f7f6f2",
          100: "#e8e2d7",
          600: "#655f55",
          700: "#514c44",
          800: "#3f3a34",
          900: "#332f2a",
          950: "#26231f",
        },
        ochre: {
          50: "#fbf4e4",
          100: "#f5e4bf",
          200: "#eccb84",
          600: "#b67622",
          700: "#925a1d",
          800: "#75491e",
        },
        sand: {
          50: "#fffdf7",
          100: "#f4efe4",
          200: "#e6d7be",
        },
        earth: {
          50: "#f8f5ed",
          100: "#ebe3d2",
          200: "#d8c8ad",
          300: "#bba37c",
          600: "#776449",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
