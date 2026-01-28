export type ThemeName = "default" | "night" | "sepia" | "contrast";

export interface ThemeColors {
  background: string;
  foreground: string;
  textPrimary: string;
  textSecondary: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  border: string;
  card: string;
  muted: string;
  mutedForeground: string;
}

export const themes: Record<ThemeName, ThemeColors> = {
  default: {
    background: "#ffffff",
    foreground: "#0a0a0a",
    textPrimary: "#0a0a0a",
    textSecondary: "#666666",
    primary: "#3b82f6",
    primaryForeground: "#ffffff",
    secondary: "#f5f6f7",
    secondaryForeground: "#0a0a0a",
    accent: "#e2a93d",
    border: "#e5e5e5",
    card: "#ffffff",
    muted: "#f5f6f7",
    mutedForeground: "#666666",
  },
  night: {
    background: "#16181c",
    foreground: "#f2f2f2",
    textPrimary: "#f2f2f2",
    textSecondary: "#b3b3b3",
    primary: "#3b82f6",
    primaryForeground: "#ffffff",
    secondary: "#1e2228",
    secondaryForeground: "#f2f2f2",
    accent: "#e2a93d",
    border: "#2b313b",
    card: "#1c2026",
    muted: "#1e2228",
    mutedForeground: "#b3b3b3",
  },
  sepia: {
    background: "#efe4d0",
    foreground: "#2d2216",
    textPrimary: "#2d2216",
    textSecondary: "#6b5b4b",
    primary: "#9c6a2f",
    primaryForeground: "#efe4d0",
    secondary: "#e6d9c3",
    secondaryForeground: "#2d2216",
    accent: "#d0a040",
    border: "#d8c7a6",
    card: "#f6eddd",
    muted: "#e6d9c3",
    mutedForeground: "#6b5b4b",
  },
  contrast: {
    background: "#ffffff",
    foreground: "#000000",
    textPrimary: "#000000",
    textSecondary: "#333333",
    primary: "#0f4cbf",
    primaryForeground: "#ffffff",
    secondary: "#f2f2f2",
    secondaryForeground: "#000000",
    accent: "#f2b705",
    border: "#000000",
    card: "#ffffff",
    muted: "#f2f2f2",
    mutedForeground: "#333333",
  },
};
