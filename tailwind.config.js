/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#EFF0F4",
        accent: "#035A9D", // your preferred color
        offblack: "#0B0F14",
        blackish: "#1A1D21",
      },
      fontFamily: {
        display: ["Poppins", "ui-sans-serif", "system-ui"],
      },
    },
  },
};
