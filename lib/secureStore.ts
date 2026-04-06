// lib/secureStore.ts
// Simple wrapper around expo-secure-store for storing sensitive data like auth tokens.

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export async function setItemAsync(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.setItemAsync(key, value);
}

export async function getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    return await SecureStore.getItemAsync(key);
}

export async function deleteItemAsync(key: string): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.deleteItemAsync(key);
}
