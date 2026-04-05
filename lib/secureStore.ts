// lib/secureStore.ts
// Simple wrapper around expo-secure-store for storing sensitive data like auth tokens.

import * as SecureStore from 'expo-secure-store';

export async function setItemAsync(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
}

export async function getItemAsync(key: string): Promise<string | null> {
    return await SecureStore.getItemAsync(key);
}

export async function deleteItemAsync(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
}
