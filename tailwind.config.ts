import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          bg: "#06030c",
          card: "rgba(255, 255, 255, 0.04)",
          border: "rgba(255, 255, 255, 0.1)",
          accent: "#ff69b4",
          purple: "#8a2be2",
          glow: "#b15eff",
        },
      },
      fontFamily: {
        prompt: ["Prompt", "sans-serif"],
        jakarta: ["Plus Jakarta Sans", "sans-serif"],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        glow: {
          "0%": { filter: "drop-shadow(0 0 8px rgba(255,105,180,0.4))" },
          "100%": { filter: "drop-shadow(0 0 16px rgba(138,43,226,0.8))" },
        },
        sparkle: {
          "0%, 100%": { opacity: "0.3", transform: "scale(0.8)" },
          "50%": { opacity: "1", transform: "scale(1.2)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        glow: "glow 3s ease-in-out infinite alternate",
        sparkle: "sparkle 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
