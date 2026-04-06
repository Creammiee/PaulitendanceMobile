import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppTheme } from '../hooks/useAppTheme';
import { ColorTheme } from '../constants/Colors';
import { AuthProvider, useAuth } from '../ctx/AuthContext';
import { AppThemeProvider, useThemeContext } from '../ctx/ThemeContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const { themeMode } = useThemeContext(); // Get the current mode for the native theme
  const systemColorScheme = useColorScheme();
  
  const colorScheme = themeMode === 'system' ? systemColorScheme : themeMode;
  
  const { user, role, status, loading } = useAuth();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function checkOnboarding() {
      if (Platform.OS === 'web') {
        setHasSeenOnboarding(true);
        setCheckingOnboarding(false);
        return;
      }
      try {
        const value = await SecureStore.getItemAsync('has_seen_onboarding');
        setHasSeenOnboarding(value === 'true');
      } catch (e) {
        setHasSeenOnboarding(false);
      } finally {
        setCheckingOnboarding(false);
      }
    }
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (loading || checkingOnboarding) return;

    const inSignIn = segments[0] === 'sign-in';
    const inSignUp = segments[0] === 'sign-up';
    const inOnboarding = segments[0] === 'onboarding';
    const inPublic = inSignIn || inSignUp || inOnboarding;

    if (!hasSeenOnboarding && !inOnboarding) {
        router.replace('/onboarding');
        return;
    }

    if (!user && !inPublic) {
      router.replace('/sign-in');
    } else if (user) {
      
      const currentSegment = segments[0];

      if (status === 'pending') {
        if (currentSegment !== 'pending') {
            router.replace('/pending' as any);
        }
        return;
      }

      if (role === 'admin' && currentSegment !== '(admin)') {
        router.replace('/(admin)');
      } else if (role === 'student' && currentSegment !== '(student)') {
        router.replace('/(student)' as any);
      } else if (role === 'parent' && currentSegment !== '(parent)') {
        router.replace('/(parent)' as any);
      } else if (role === 'teacher' && currentSegment !== '(teacher)') {
        router.replace('/(teacher)' as any);
      } else if (inOnboarding) {
        // If they completed onboarding but reached here, send back to role dashboard
        // handled by above blocks
      }
    }
  }, [user, role, loading, segments, hasSeenOnboarding, checkingOnboarding]);

  if (loading || checkingOnboarding) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.solidBlue} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(parent)" />
        <Stack.Screen name={"(teacher)" as any} />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="pending" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </AppThemeProvider>
  );
}

function getStyles(theme: ColorTheme) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        }
    });
}
