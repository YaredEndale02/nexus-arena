import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        heading: ["Rajdhani", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // Dark Background Palette (UI & Surfaces)
        canvas: "#0D0E10", // Deep Black
        charcoal: "#1A1C1F", // Dark Charcoal
        slate: {
          DEFAULT: "#2B2E33", // Metallic Slate
          metallic: "#2B2E33",
        },
        surface: {
          DEFAULT: "#1A1C1F",
          black: "#0D0E10",
          charcoal: "#1A1C1F",
          slate: "#2B2E33",
          elevated: "#2B2E33",
        },

        // Primary Gold Palette (Shield & Branding)
        gold: {
          DEFAULT: "#D4AF37", // Base Gold (Primary)
          light: "#F8E297", // Light Gold (Highlight)
          highlight: "#F8E297",
          primary: "#D4AF37",
          dark: "#92722A", // Deep Gold (Shadow)
          shadow: "#92722A",
          foreground: "#0D0E10",
        },

        // Accent Palette (UI Elements & Statuses)
        electric: {
          DEFAULT: "#CCFF00", // Electric Lime/Yellow (CTA buttons)
          lime: "#CCFF00",
          foreground: "#000000",
        },
        lime: {
          DEFAULT: "#CCFF00",
          500: "#CCFF00",
          600: "#b8e600",
        },
        purple: {
          DEFAULT: "#6B46C1", // Muted Purple
          muted: "#6B46C1",
          400: "#9F7AEA",
          500: "#6B46C1",
          600: "#553C9A",
        },

        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "#CCFF00",
          foreground: "#000000",
          hover: "#b8e600",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        neon: {
          blue: "hsl(var(--neon-blue))",
          purple: "#6B46C1",
        },
        sidebar: {
          DEFAULT: "#1A1C1F",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "#D4AF37",
          "primary-foreground": "#0D0E10",
          accent: "#2B2E33",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "#2B2E33",
          ring: "#D4AF37",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        glow: "0 0 15px rgba(0, 224, 255, 0.4)",
        "glow-lg": "0 0 25px rgba(0, 224, 255, 0.6)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(15px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "slide-up": "slide-up 0.4s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
      },
    },
  },
  plugins: [animate],
} satisfies Config;

