import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeName, themes, ThemeColors } from "../theme/themes";

interface ThemeContextType {
  themeName: ThemeName;
  colors: ThemeColors;
  setThemeName: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "readingTheme";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeName, setThemeNameState] = useState<ThemeName>("default");

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && (saved in themes)) {
        setThemeNameState(saved as ThemeName);
      }
    };
    load();
  }, []);

  const setThemeName = (theme: ThemeName) => {
    setThemeNameState(theme);
    AsyncStorage.setItem(STORAGE_KEY, theme);
  };

  return (
    <ThemeContext.Provider
      value={{ themeName, colors: themes[themeName], setThemeName }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
