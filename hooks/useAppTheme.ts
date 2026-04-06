import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, ColorTheme } from '../constants/Colors';
import { useThemeContext } from '../ctx/ThemeContext';

export function useAppTheme(): ColorTheme {
    const systemColorScheme = useColorScheme();
    const { themeMode } = useThemeContext();

    const currentMode = themeMode === 'system' ? systemColorScheme : themeMode;

    return currentMode === 'dark' ? darkTheme : lightTheme;
}
