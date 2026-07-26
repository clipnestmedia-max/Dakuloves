import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        maroon: "#320006",
        burgundy: "#57000D",
        blackred: "#140003",
        champagne: "#E6C98B",
        brightgold: "#F2C34D",
        cream: "#F5E8CB"
      },
      boxShadow: {
        gold: "0 0 24px rgba(242,195,77,.38)"
      }
    }
  },
  plugins: []
};

export default config;
