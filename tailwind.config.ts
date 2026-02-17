import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effefb",
          100: "#c8fced",
          200: "#94f7dd",
          300: "#58ebca",
          400: "#21d4af",
          500: "#07b899",
          600: "#02927d",
          700: "#057566",
          800: "#085d52",
          900: "#0a4d44"
        }
      }
    }
  },
  plugins: []
};

export default config;
