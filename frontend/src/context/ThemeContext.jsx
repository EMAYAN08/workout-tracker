import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { getItem, setItem } from '../storage';
import { palettes, fonts, radius, spacing, muscleTones } from '../theme';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'trackit_theme';

export function ThemeProvider({ children }) {
  const [scheme, setScheme] = useState('dark');
  const [tabBarHidden, setTabBarHidden] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') setScheme(saved);
    })();
  }, []);

  const value = useMemo(() => {
    const colors = palettes[scheme];
    const toggleTheme = async () => {
      const next = scheme === 'dark' ? 'light' : 'dark';
      setScheme(next);
      await setItem(STORAGE_KEY, next);
    };
    return {
      scheme,
      isDark: scheme === 'dark',
      colors,
      fonts,
      radius,
      spacing,
      muscleColors: muscleTones[scheme],
      toggleTheme,
      tabBarHidden,
      setTabBarHidden,
    };
  }, [scheme, tabBarHidden]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      scheme: 'dark',
      isDark: true,
      colors: palettes.dark,
      fonts,
      radius,
      spacing,
      muscleColors: muscleTones.dark,
      toggleTheme: () => {},
      tabBarHidden: false,
      setTabBarHidden: () => {},
    };
  }
  return ctx;
}

export function useThemedStyles(factory) {
  const theme = useTheme();
  const factoryRef = useRef(factory);
  factoryRef.current = factory;
  return useMemo(() => StyleSheet.create(factoryRef.current(theme)), [theme]);
}
