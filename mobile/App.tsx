import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import { InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold } from '@expo-google-fonts/instrument-sans';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { onlineManager, QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { ApiError } from './src/api/client';
import Background from './src/components/Background';
import OfflineBanner from './src/components/OfflineBanner';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import { AuthNavigator, MainNavigator } from './src/navigation';
import { colors } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// React Query follows the phone's connectivity: paused while offline, refetched on reconnect.
onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)));

const DAY = 24 * 60 * 60 * 1000;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: DAY, // kept for a day so the persisted copy can be shown offline
      // Never retry 4xx responses (bad input, 401, 404); retry flaky network errors twice.
      retry: (count, error) => ((error as ApiError).status ?? 0) < 400 && count < 2,
    },
  },
});

const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'orbit.query-cache', throttleTime: 1000 });

function Root() {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.iris} />
      </View>
    );
  }
  return status === 'authed' ? <MainNavigator /> : <AuthNavigator />;
}

export default function App() {
  const [fontsLoaded] = useFonts({ BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (fontsLoaded) {
      setReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);
  const persistOptions = useMemo(() => ({ persister, maxAge: DAY }), []);

  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <StatusBar style="light" />
        <Background>
          <ToastProvider>
            <AuthProvider onSignedOut={async () => { await persister.removeClient(); }}>
              <Root />
              <OfflineBanner />
            </AuthProvider>
          </ToastProvider>
        </Background>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
