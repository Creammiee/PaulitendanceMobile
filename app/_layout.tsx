import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '../constants/Colors';
import { AuthProvider, useAuth } from '../ctx/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, role, status, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inSignIn = segments[0] === 'sign-in';
    const inSignUp = segments[0] === 'sign-up';
    const inPublic = inSignIn || inSignUp;

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
      }
    }
  }, [user, role, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.nightTime }}>
        <ActivityIndicator size="large" color={Colors.solidBlue} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="(student)" options={{ headerShown: false }} />
        <Stack.Screen name="(parent)" options={{ headerShown: false }} />
        <Stack.Screen name={"(teacher)" as any} options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="pending" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
