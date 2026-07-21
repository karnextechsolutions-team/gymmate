import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Electric-blue accent pulled from the screenshots
        brand: {
          DEFAULT: "#2D6BFF",
          50: "#EAF1FF",
          100: "#D6E3FF",
          400: "#5C8BFF",
          500: "#2D6BFF",
          600: "#1F54E0",
          700: "#1A45BD",
        },
        // Near-black surfaces
        ink: {
          900: "#0A0A0B", // app background
          800: "#0F0F12", // raised background
          700: "#16161A", // card
          600: "#1E1E24", // card hover / input
          500: "#2A2A31", // border
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        glow: "0 8px 40px -8px rgba(45,107,255,0.45)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 30px -12px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "brand-grad": "linear-gradient(160deg,#2D6BFF 0%,#1A45BD 100%)",
        "auth-grad":
          "radial-gradient(120% 90% at 50% 0%, #1E54E0 0%, #123089 35%, #0A0A0B 75%)",
      },
    },
  },
  plugins: [],
};
export default config;
