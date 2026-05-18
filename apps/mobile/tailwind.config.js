/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bistro: {
          bg: "#0c0f14",
          card: "#151a22",
          accent: "#3ddc97",
          muted: "#8b97a8",
        },
      },
    },
  },
  plugins: [],
};
