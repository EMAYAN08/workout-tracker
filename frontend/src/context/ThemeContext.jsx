import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { getItem, setItem } from '../storage';
import {
  palettes,
  fonts,
  radius,
  spacing,
  muscleTones,
  resolvePalette,
  DEFAULT_ACCENT_ID,
  DEFAULT_CHART_ID,
  CUSTOM_COLOR_ID,
} from '../theme';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'trackit_theme';

async function persist(next) {
  await setItem(STORAGE_KEY, JSON.stringify(next));
}

export function ThemeProvider({ children }) {
  const [scheme, setScheme] = useState('dark');
  const [accentId, setAccentId] = useState(DEFAULT_ACCENT_ID);
  const [chartId, setChartId] = useState(DEFAULT_CHART_ID);
  const [accentHex, setAccentHex] = useState('');
  const [chartHex, setChartHex] = useState('');
  const [tabBarHidden, setTabBarHidden] = useState(false);
  const hexSave = useRef(null);

  useEffect(() => {
    (async () => {
      const saved = await getItem(STORAGE_KEY);
      if (!saved) return;
      if (saved === 'dark' || saved === 'light') {
        setScheme(saved);
        return;
      }
      try {
        const parsed = JSON.parse(saved);
        if (parsed.scheme === 'dark' || parsed.scheme === 'light') setScheme(parsed.scheme);
        if (parsed.accentId) setAccentId(parsed.accentId);
        if (parsed.chartId) setChartId(parsed.chartId);
        if (parsed.accentHex) setAccentHex(parsed.accentHex);
        if (parsed.chartHex) setChartHex(parsed.chartHex);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const value = useMemo(() => {
    const colors = resolvePalette(scheme, accentId, chartId, { accent: accentHex, chart: chartHex });
    const save = (patch) =>
      persist({
        scheme: patch.scheme ?? scheme,
        accentId: patch.accentId ?? accentId,
        chartId: patch.chartId ?? chartId,
        accentHex: patch.accentHex ?? accentHex,
        chartHex: patch.chartHex ?? chartHex,
      });
    const toggleTheme = async () => {
      const next = scheme === 'dark' ? 'light' : 'dark';
      setScheme(next);
      await save({ scheme: next });
    };
    const setAccent = async (id) => {
      setAccentId(id);
      await save({ accentId: id });
    };
    const setChart = async (id) => {
      setChartId(id);
      await save({ chartId: id });
    };
    const setAccentCustom = (hex) => {
      setAccentId(CUSTOM_COLOR_ID);
      setAccentHex(hex);
      clearTimeout(hexSave.current);
      hexSave.current = setTimeout(() => {
        persist({
          scheme,
          accentId: CUSTOM_COLOR_ID,
          chartId,
          accentHex: hex,
          chartHex,
        });
      }, 180);
    };
    const setChartCustom = (hex) => {
      setChartId(CUSTOM_COLOR_ID);
      setChartHex(hex);
      clearTimeout(hexSave.current);
      hexSave.current = setTimeout(() => {
        persist({
          scheme,
          accentId,
          chartId: CUSTOM_COLOR_ID,
          accentHex,
          chartHex: hex,
        });
      }, 180);
    };
    const setSchemeValue = async (next) => {
      setScheme(next);
      await save({ scheme: next });
    };
    return {
      scheme,
      isDark: scheme === 'dark',
      accentId,
      chartId,
      accentHex,
      chartHex,
      colors,
      fonts,
      radius,
      spacing,
      muscleColors: muscleTones[scheme],
      toggleTheme,
      setScheme: setSchemeValue,
      setAccentId: setAccent,
      setChartId: setChart,
      setAccentCustom,
      setChartCustom,
      tabBarHidden,
      setTabBarHidden,
    };
  }, [scheme, accentId, chartId, accentHex, chartHex, tabBarHidden]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      scheme: 'dark',
      isDark: true,
      accentId: DEFAULT_ACCENT_ID,
      chartId: DEFAULT_CHART_ID,
      accentHex: '',
      chartHex: '',
      colors: palettes.dark,
      fonts,
      radius,
      spacing,
      muscleColors: muscleTones.dark,
      toggleTheme: () => {},
      setScheme: () => {},
      setAccentId: () => {},
      setChartId: () => {},
      setAccentCustom: () => {},
      setChartCustom: () => {},
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
