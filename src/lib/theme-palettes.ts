export type ThemePaletteKey = "emerald" | "amber" | "blue" | "ruby" | "purple" | "slate";

export interface ThemePalette {
  key: ThemePaletteKey;
  nome: string;
  descricao: string;
  badgeHex: string;
  cssVars: Record<string, string>;
}

export const FAZENDA_PALETTES: Record<ThemePaletteKey, ThemePalette> = {
  emerald: {
    key: "emerald",
    nome: "Verde Esmeralda",
    descricao: "Café de Lavoura & Sustentabilidade",
    badgeHex: "#10b981",
    cssVars: {
      "--primary": "oklch(0.38 0.12 155)",
      "--primary-foreground": "oklch(0.985 0.005 150)",
      "--primary-soft": "oklch(0.93 0.04 150)",
      "--accent": "oklch(0.55 0.15 150)",
      "--ring": "oklch(0.55 0.15 150)",
      "--sidebar": "oklch(0.18 0.05 155)",
      "--sidebar-foreground": "oklch(0.96 0.01 150)",
      "--sidebar-primary": "oklch(0.55 0.15 150)",
      "--sidebar-accent": "oklch(0.25 0.06 155)",
      "--sidebar-border": "oklch(0.26 0.06 155)",
    },
  },
  amber: {
    key: "amber",
    nome: "Âmbar Dourado",
    descricao: "Grão Torrado & Mel",
    badgeHex: "#f59e0b",
    cssVars: {
      "--primary": "oklch(0.36 0.11 55)",
      "--primary-foreground": "oklch(0.985 0.005 60)",
      "--primary-soft": "oklch(0.93 0.05 60)",
      "--accent": "oklch(0.62 0.16 65)",
      "--ring": "oklch(0.62 0.16 65)",
      "--sidebar": "oklch(0.18 0.04 50)",
      "--sidebar-foreground": "oklch(0.96 0.01 60)",
      "--sidebar-primary": "oklch(0.62 0.16 65)",
      "--sidebar-accent": "oklch(0.26 0.06 50)",
      "--sidebar-border": "oklch(0.26 0.06 50)",
    },
  },
  blue: {
    key: "blue",
    nome: "Azul Oceano",
    descricao: "Corporativo & Pedra Negra",
    badgeHex: "#3b82f6",
    cssVars: {
      "--primary": "oklch(0.32 0.09 255)",
      "--primary-foreground": "oklch(0.985 0.005 240)",
      "--primary-soft": "oklch(0.92 0.04 250)",
      "--accent": "oklch(0.58 0.13 250)",
      "--ring": "oklch(0.58 0.13 250)",
      "--sidebar": "oklch(0.22 0.05 260)",
      "--sidebar-foreground": "oklch(0.96 0.01 250)",
      "--sidebar-primary": "oklch(0.58 0.13 250)",
      "--sidebar-accent": "oklch(0.30 0.06 260)",
      "--sidebar-border": "oklch(0.30 0.06 260)",
    },
  },
  ruby: {
    key: "ruby",
    nome: "Vinho Cereja",
    descricao: "Fruto Maduro & Especial",
    badgeHex: "#f43f5e",
    cssVars: {
      "--primary": "oklch(0.36 0.14 15)",
      "--primary-foreground": "oklch(0.985 0.005 15)",
      "--primary-soft": "oklch(0.93 0.04 15)",
      "--accent": "oklch(0.58 0.18 15)",
      "--ring": "oklch(0.58 0.18 15)",
      "--sidebar": "oklch(0.18 0.06 15)",
      "--sidebar-foreground": "oklch(0.96 0.01 15)",
      "--sidebar-primary": "oklch(0.58 0.18 15)",
      "--sidebar-accent": "oklch(0.26 0.07 15)",
      "--sidebar-border": "oklch(0.26 0.07 15)",
    },
  },
  purple: {
    key: "purple",
    nome: "Púrpura Imperial",
    descricao: "Terra Roxa & Nobreza",
    badgeHex: "#a855f7",
    cssVars: {
      "--primary": "oklch(0.35 0.14 300)",
      "--primary-foreground": "oklch(0.985 0.005 300)",
      "--primary-soft": "oklch(0.93 0.04 300)",
      "--accent": "oklch(0.58 0.18 300)",
      "--ring": "oklch(0.58 0.18 300)",
      "--sidebar": "oklch(0.18 0.06 300)",
      "--sidebar-foreground": "oklch(0.96 0.01 300)",
      "--sidebar-primary": "oklch(0.58 0.18 300)",
      "--sidebar-accent": "oklch(0.26 0.07 300)",
      "--sidebar-border": "oklch(0.26 0.07 300)",
    },
  },
  slate: {
    key: "slate",
    nome: "Grafite Vulcânico",
    descricao: "Elegante & Sóbrio",
    badgeHex: "#64748b",
    cssVars: {
      "--primary": "oklch(0.28 0.02 250)",
      "--primary-foreground": "oklch(0.985 0.005 250)",
      "--primary-soft": "oklch(0.92 0.01 250)",
      "--accent": "oklch(0.50 0.03 250)",
      "--ring": "oklch(0.50 0.03 250)",
      "--sidebar": "oklch(0.15 0.02 250)",
      "--sidebar-foreground": "oklch(0.96 0.01 250)",
      "--sidebar-primary": "oklch(0.50 0.03 250)",
      "--sidebar-accent": "oklch(0.22 0.02 250)",
      "--sidebar-border": "oklch(0.22 0.02 250)",
    },
  },
};

export function applyFazendaPalette(corKey?: string | null) {
  if (typeof document === "undefined") return;
  const key = (corKey as ThemePaletteKey) || "emerald";
  const palette = FAZENDA_PALETTES[key] || FAZENDA_PALETTES["emerald"];
  const root = document.documentElement;

  Object.entries(palette.cssVars).forEach(([prop, val]) => {
    root.style.setProperty(prop, val);
  });
}
