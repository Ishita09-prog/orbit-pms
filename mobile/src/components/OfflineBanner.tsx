import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../theme';

/** Slides in whenever the phone has no connection; cached data stays readable underneath. */
export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const [mounted, setMounted] = useState(false);
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => NetInfo.addEventListener((s) => setOffline(s.isConnected === false || s.isInternetReachable === false)), []);

  useEffect(() => {
    if (offline) setMounted(true);
    Animated.timing(v, { toValue: offline ? 1 : 0, duration: 260, useNativeDriver: true }).start(() => {
      if (!offline) setMounted(false);
    });
  }, [offline, v]);

  if (!mounted) return null;
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[styles.bar, { top: insets.top + 8, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] }]}
    >
      <Ionicons name="cloud-offline-outline" size={18} color={colors.amber} />
      <Text style={styles.text}>You’re offline. Showing saved data; changes won’t sync until you reconnect.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: '#2a2440',
    borderWidth: 1,
    borderColor: 'rgba(255,193,90,0.5)',
  },
  text: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 13.5 },
});
