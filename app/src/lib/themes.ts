export interface ThemeColors {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  gold: string;
  copper: string;
  lavender: string;
  teal: string;
  rose: string;
  error: string;
  border: string;
  separator: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
}

export const themes: Theme[] = [
  {
    id: "midnight",
    name: "Midnight",
    colors: {
      bg: "#0e0e0e",
      surface: "#191a1a",
      text: "#e7e5e5",
      textMuted: "#acabaa",
      accent: "#acc7fb",
      gold: "#bd9952",
      copper: "#c4956a",
      lavender: "#a78bba",
      teal: "#6ea8a0",
      rose: "#b8697a",
      error: "#f87171",
      border: "#484848",
      separator: "#484848",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    colors: {
      bg: "#282a36",
      surface: "#21222c",
      text: "#f8f8f2",
      textMuted: "#6272a4",
      accent: "#bd93f9",
      gold: "#f1fa8c",
      copper: "#ffb86c",
      lavender: "#bd93f9",
      teal: "#8be9fd",
      rose: "#ff79c6",
      error: "#ff5555",
      border: "#44475a",
      separator: "#44475a",
    },
  },
  {
    id: "catppuccin",
    name: "Catppuccin Mocha",
    colors: {
      bg: "#1e1e2e",
      surface: "#181825",
      text: "#cdd6f4",
      textMuted: "#6c7086",
      accent: "#89b4fa",
      gold: "#f9e2af",
      copper: "#fab387",
      lavender: "#b4befe",
      teal: "#94e2d5",
      rose: "#f38ba8",
      error: "#f38ba8",
      border: "#313244",
      separator: "#45475a",
    },
  },
  {
    id: "nord",
    name: "Nord",
    colors: {
      bg: "#2e3440",
      surface: "#272c36",
      text: "#eceff4",
      textMuted: "#4c566a",
      accent: "#88c0d0",
      gold: "#ebcb8b",
      copper: "#d08770",
      lavender: "#b48ead",
      teal: "#8fbcbb",
      rose: "#bf616a",
      error: "#bf616a",
      border: "#3b4252",
      separator: "#434c5e",
    },
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    colors: {
      bg: "#1a1b26",
      surface: "#16161e",
      text: "#c0caf5",
      textMuted: "#565f89",
      accent: "#7aa2f7",
      gold: "#e0af68",
      copper: "#ff9e64",
      lavender: "#bb9af7",
      teal: "#73daca",
      rose: "#f7768e",
      error: "#f7768e",
      border: "#292e42",
      separator: "#3b4261",
    },
  },
  {
    id: "solarized",
    name: "Solarized Dark",
    colors: {
      bg: "#002b36",
      surface: "#073642",
      text: "#839496",
      textMuted: "#586e75",
      accent: "#268bd2",
      gold: "#b58900",
      copper: "#cb4b16",
      lavender: "#6c71c4",
      teal: "#2aa198",
      rose: "#d33682",
      error: "#dc322f",
      border: "#073642",
      separator: "#586e75",
    },
  },
  {
    id: "gruvbox",
    name: "Gruvbox Dark",
    colors: {
      bg: "#282828",
      surface: "#1d2021",
      text: "#ebdbb2",
      textMuted: "#928374",
      accent: "#83a598",
      gold: "#d79921",
      copper: "#d65d0e",
      lavender: "#d3869b",
      teal: "#8ec07c",
      rose: "#fb4934",
      error: "#fb4934",
      border: "#3c3836",
      separator: "#504945",
    },
  },
];

export const defaultTheme = themes[0];

export function getThemeById(id: string): Theme {
  return themes.find((t) => t.id === id) ?? defaultTheme;
}

/** Apply a theme's CSS custom properties to the document root */
export function applyThemeToDocument(theme: Theme): void {
  const root = document.documentElement;
  const c = theme.colors;
  root.style.setProperty("--le-bg", c.bg);
  root.style.setProperty("--le-surface", c.surface);
  root.style.setProperty("--le-text", c.text);
  root.style.setProperty("--le-text-muted", c.textMuted);
  root.style.setProperty("--le-accent", c.accent);
  root.style.setProperty("--le-gold", c.gold);
  root.style.setProperty("--le-copper", c.copper);
  root.style.setProperty("--le-lavender", c.lavender);
  root.style.setProperty("--le-teal", c.teal);
  root.style.setProperty("--le-rose", c.rose);
  root.style.setProperty("--le-error", c.error);
  root.style.setProperty("--le-border", c.border);
  root.style.setProperty("--le-separator", c.separator);
}
