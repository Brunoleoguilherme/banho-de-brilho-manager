import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Identidade visual da marca (mesma do site e do login):
        // azul #69A9CF · verde-limão #A8CF00 · azul-escuro #0F2742
        brand: {
          petrol: "#3E7CB1", // azul da marca (botões primários, links, códigos)
          dark: "#0F2742", // azul-escuro (sidebar, fundos escuros)
          teal: "#A8CF00", // verde-limão (destaques, item ativo, acentos)
          gold: "#69A9CF", // azul-claro (chips e acentos secundários)
        },
        surface: "#F5F7FA",
        ink: {
          DEFAULT: "#0F2742",
          muted: "#64748B",
        },
        danger: "#DC2626",
        success: "#16A34A",
        warning: "#F59E0B",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 39, 66, 0.08), 0 1px 2px rgba(15, 39, 66, 0.04)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
