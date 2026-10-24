import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import { useColorScheme, vars } from 'nativewind';
import { hexToRgbChannels, themes, type ColorScheme, type ThemeColors } from '@design/tokens';

function buildVars(scheme: ColorScheme) {
  const entries = Object.entries(themes[scheme])
    .filter(([, v]) => v.startsWith('#'))
    .map(([k, v]) => [`--c-${k}`, hexToRgbChannels(v)]);
  return vars(Object.fromEntries(entries));
}

const themeVars = { light: buildVars('light'), dark: buildVars('dark') };

type ThemeValue = {
  scheme: ColorScheme;
  colors: ThemeColors;
  setScheme: (s: ColorScheme | 'system') => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme, toggleColorScheme } = useColorScheme();
  const scheme: ColorScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const value = useMemo<ThemeValue>(
    () => ({ scheme, colors: themes[scheme], setScheme: setColorScheme, toggle: toggleColorScheme }),
    [scheme, setColorScheme, toggleColorScheme],
  );
  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVars[scheme]]} className="bg-bg">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

/** Pour les props qui ne prennent pas de className (icônes, Reanimated, StatusBar). */
export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé sous <ThemeProvider>');
  return ctx;
}
