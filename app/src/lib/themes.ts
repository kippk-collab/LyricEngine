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
    id: "industrial",
    name: "Industrial",
    colors: {
      bg: "#0d0c0a",
      surface: "#18160f",
      text: "#ede8dc",
      textMuted: "#8a8274",
      accent: "#5a8abf",
      gold: "#d4943a",
      copper: "#f0b456",
      lavender: "#9a7abf",
      teal: "#4a9e8e",
      rose: "#c65d4a",
      error: "#c65d4a",
      border: "#332e22",
      separator: "#4a4231",
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
    id: "slate",
    name: "Slate",
    colors: {
      bg: "#3a3f4a",
      surface: "#333842",
      text: "#d8dce6",
      textMuted: "#8e95a4",
      accent: "#6a9cd0",
      gold: "#d4943a",
      copper: "#f0b456",
      lavender: "#9a80c0",
      teal: "#5aaa9e",
      rose: "#d06050",
      error: "#d06050",
      border: "#525968",
      separator: "#636b7c",
    },
  },
  {
    id: "dusk",
    name: "Dusk",
    colors: {
      bg: "#4a4050",
      surface: "#423848",
      text: "#e0d8e8",
      textMuted: "#9a8ea8",
      accent: "#78a0d0",
      gold: "#d8a050",
      copper: "#f0be68",
      lavender: "#a888c8",
      teal: "#60b0a8",
      rose: "#d86868",
      error: "#d86868",
      border: "#645870",
      separator: "#786c84",
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
  {
    id: "overcast",
    name: "Overcast",
    colors: {
      bg: "#9a9098",
      surface: "#908690",
      text: "#2a2428",
      textMuted: "#584e58",
      accent: "#4870a8",
      gold: "#b87a28",
      copper: "#d09038",
      lavender: "#7858a0",
      teal: "#388880",
      rose: "#b84838",
      error: "#b84838",
      border: "#b8b0b8",
      separator: "#c8c0c8",
    },
  },
  {
    id: "partly-cloudy",
    name: "Partly Cloudy",
    colors: {
      bg: "#aab8c8",
      surface: "#a0b0c0",
      text: "#1a2430",
      textMuted: "#3e5068",
      accent: "#2a68b0",
      gold: "#b87820",
      copper: "#d09030",
      lavender: "#6858a8",
      teal: "#2a8880",
      rose: "#b04838",
      error: "#b04838",
      border: "#c0ccd8",
      separator: "#d0d8e2",
    },
  },
  {
    id: "daylight",
    name: "Daylight",
    colors: {
      bg: "#faf8f5",
      surface: "#ffffff",
      text: "#2c2a26",
      textMuted: "#7a756a",
      accent: "#3a70b0",
      gold: "#c27d1a",
      copper: "#e09422",
      lavender: "#7a5aaf",
      teal: "#2a8a7e",
      rose: "#c44a38",
      error: "#c44a38",
      border: "#ddd8ce",
      separator: "#c8c2b6",
    },
  },
  {
    id: "paper",
    name: "Paper",
    colors: {
      bg: "#f5f0e8",
      surface: "#ebe5da",
      text: "#3a3530",
      textMuted: "#807868",
      accent: "#486898",
      gold: "#b86e2a",
      copper: "#d08438",
      lavender: "#785aa0",
      teal: "#38807a",
      rose: "#b84a3a",
      error: "#b84a3a",
      border: "#d0c8b8",
      separator: "#b8b0a0",
    },
  },
  {
    id: "clean",
    name: "Clean",
    colors: {
      bg: "#ffffff",
      surface: "#f7f7f7",
      text: "#1a1a1a",
      textMuted: "#666666",
      accent: "#2c68b0",
      gold: "#c27d1a",
      copper: "#e09422",
      lavender: "#6a4aaa",
      teal: "#1a7a70",
      rose: "#c0392b",
      error: "#c0392b",
      border: "#e0e0e0",
      separator: "#c8c8c8",
    },
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    colors: {
      bg: "#fdf6e3",
      surface: "#eee8d5",
      text: "#657b83",
      textMuted: "#93a1a1",
      accent: "#268bd2",
      gold: "#b58900",
      copper: "#cb4b16",
      lavender: "#6c71c4",
      teal: "#2aa198",
      rose: "#d33682",
      error: "#dc322f",
      border: "#eee8d5",
      separator: "#d3cbb7",
    },
  },
  {
    id: "morning-fog",
    name: "Morning Fog",
    colors: {
      bg: "#f0f0f5",
      surface: "#e4e4ec",
      text: "#3a3a4a",
      textMuted: "#8888a0",
      accent: "#5b7fc4",
      gold: "#c49532",
      copper: "#c07848",
      lavender: "#8e6eb5",
      teal: "#4a9e93",
      rose: "#c45b78",
      error: "#d94452",
      border: "#d4d4e0",
      separator: "#c8c8d8",
    },
  },
  {
    id: "botanical",
    name: "Botanical",
    colors: {
      bg: "#f4f1eb",
      surface: "#e8e3d8",
      text: "#3d4a3a",
      textMuted: "#7e8e78",
      accent: "#5a8a5e",
      gold: "#b8942e",
      copper: "#b87040",
      lavender: "#8a72a8",
      teal: "#3e9485",
      rose: "#c2607a",
      error: "#cf4a4a",
      border: "#d6d1c5",
      separator: "#cac4b5",
    },
  },
  {
    id: "peach-sky",
    name: "Peach Sky",
    colors: {
      bg: "#fef5f0",
      surface: "#f5e8e0",
      text: "#4a3838",
      textMuted: "#a08888",
      accent: "#e07850",
      gold: "#d4a030",
      copper: "#d08058",
      lavender: "#a880c0",
      teal: "#58a8a0",
      rose: "#d86080",
      error: "#e04848",
      border: "#eadad0",
      separator: "#e0d0c4",
    },
  },
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    colors: {
      bg: "#f0f6fa",
      surface: "#e0ecf4",
      text: "#2c3e50",
      textMuted: "#7f99b0",
      accent: "#3498db",
      gold: "#c8a840",
      copper: "#c47838",
      lavender: "#9b78c8",
      teal: "#1abc9c",
      rose: "#d05888",
      error: "#e74c3c",
      border: "#ccdae8",
      separator: "#bed0e0",
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
