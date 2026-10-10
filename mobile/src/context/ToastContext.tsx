import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../theme';

type Kind = 'success' | 'error' | 'info';
interface ToastApi {
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
}
const ToastContext = createContext<ToastApi | null>(null);

const ICON: Record<Kind, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { name: 'checkmark-circle', color: colors.mint },
  error: { name: 'alert-circle', color: colors.flame },
  info: { name: 'information-circle', color: colors.sky },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ kind: Kind; message: string } | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (kind: Kind, message: string) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ kind, message });
      Animated.timing(anim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
      }, kind === 'error' ? 4500 : 2600);
    },
    [anim],
  );

  const api = useMemo<ToastApi>(() => ({ success: (m) => show('success', m), error: (m) => show('error', m), info: (m) => show('info', m) }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[styles.toast, { top: insets.top + 10, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] }]}
        >
          <Ionicons name={ICON[toast.kind].name} size={22} color={ICON[toast.kind].color} />
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: '#18214a',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    elevation: 12,
    zIndex: 100,
  },
  text: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 14.5 },
});
