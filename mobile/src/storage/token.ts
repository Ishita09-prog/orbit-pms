import * as SecureStore from 'expo-secure-store';

// The JWT lives in the Android Keystore / iOS Keychain (via expo-secure-store) — never in AsyncStorage.
const TOKEN_KEY = 'orbit.token';
const EXPIRY_KEY = 'orbit.expiresAt';
const USER_KEY = 'orbit.user';

export async function saveSession(token: string, expiresAt: string, user: object): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(EXPIRY_KEY, expiresAt);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function loadSession(): Promise<{ token: string; expiresAt: string | null; user: any | null } | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return null;
    const rawUser = await SecureStore.getItemAsync(USER_KEY);
    return { token, expiresAt: await SecureStore.getItemAsync(EXPIRY_KEY), user: rawUser ? JSON.parse(rawUser) : null };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await Promise.allSettled([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(EXPIRY_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
}
