import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { colors, fonts, priorityColor, radius, statusColor } from '../theme';
import { formatDay, parseDay, toISODate } from '../lib/format';
import type { TaskPriority, TaskStatus, ProjectStatus } from '../types';

type IconName = keyof typeof Ionicons.glyphMap;

/* ------------------------------------------------------------- motion */
/** Fades and lifts its content in; `index` staggers siblings. */
export function FadeIn({ children, index = 0, style }: { children: React.ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay: Math.min(index, 8) * 70, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, index]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>{children}</Animated.View>
  );
}

/** Press feedback: a small spring-scale. */
export function PressableScale({ children, style, onPress, disabled, ...rest }: React.ComponentProps<typeof Pressable> & { style?: StyleProp<ViewStyle> }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (value: number) => Animated.spring(s, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable {...rest} disabled={disabled} onPress={onPress} onPressIn={() => to(0.97)} onPressOut={() => to(1)}>
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children as React.ReactNode}</Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------ buttons */
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const content = (
    <View style={[styles.btnInner, small && { minHeight: 38, paddingHorizontal: 14 }]}>
      {loading ? <ActivityIndicator color="#fff" size="small" /> : icon ? <Ionicons name={icon} size={small ? 16 : 18} color="#fff" /> : null}
      <Text style={[styles.btnText, small && { fontSize: 14 }]}>{title}</Text>
    </View>
  );
  return (
    <PressableScale onPress={onPress} disabled={disabled || loading} accessibilityRole="button" accessibilityState={{ disabled: disabled || loading, busy: loading }} accessibilityLabel={title} style={[{ opacity: disabled ? 0.55 : 1 }, style]}>
      {variant === 'ghost' ? (
        <View style={[styles.btnBase, styles.btnGhost]}>{content}</View>
      ) : (
        <LinearGradient colors={variant === 'danger' ? ['#ff7a6b', '#e5484d'] : [colors.iris, colors.irisDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnBase}>
          {content}
        </LinearGradient>
      )}
    </PressableScale>
  );
}

export function IconButton({ name, onPress, label, color = colors.muted, size = 22 }: { name: IconName; onPress: () => void; label: string; color?: string; size?: number }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: colors.surface2 }]}>
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

/* ------------------------------------------------------------- inputs */
export function TextField({
  label,
  error,
  hint,
  icon,
  secure,
  ...rest
}: TextInputProps & { label: string; error?: string; hint?: string; icon?: IconName; secure?: boolean }) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secure));
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputFocused, !!error && styles.inputError]}>
        {icon && <Ionicons name={icon} size={19} color={colors.faint} style={{ marginLeft: 14 }} />}
        <TextInput
          {...rest}
          secureTextEntry={secure ? hidden : rest.secureTextEntry}
          placeholderTextColor={colors.faint}
          selectionColor={colors.iris}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          accessibilityLabel={label}
          style={[styles.input, rest.multiline && { minHeight: 92, textAlignVertical: 'top', paddingTop: 12 }, !icon && { paddingLeft: 14 }]}
        />
        {secure && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8} accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'} style={{ paddingHorizontal: 14 }}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.faint} />
          </Pressable>
        )}
      </View>
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle-outline" size={15} color="#ff9a8e" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function Segmented<T extends string>({ label, options, value, onChange }: { label?: string; options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ gap: 7 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.seg} accessibilityRole="radiogroup">
        {options.map((o) => {
          const active = o === value;
          return (
            <Pressable
              key={o}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onChange(o);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${label ?? ''} ${o}`.trim()}
              style={{ flex: 1 }}
            >
              {active ? (
                <LinearGradient colors={[colors.iris, colors.irisDeep]} style={styles.segItem}>
                  <Text style={[styles.segText, { color: '#fff' }]}>{o}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.segItem}>
                  <Text style={styles.segText}>{o}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function DateField({ label, value, onChange, error }: { label: string; value: string | null; onChange: (v: string | null) => void; error?: string }) {
  const [iosOpen, setIosOpen] = useState(false);
  const current = parseDay(value) ?? new Date();
  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: current, mode: 'date', onChange: (_e, d) => d && onChange(toISODate(d)) });
    } else {
      setIosOpen((o) => !o);
    }
  };
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, !!error && styles.inputError]}>
        <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={value ? `${label}: ${formatDay(value)}. Change date` : `${label}: not set. Choose date`} style={styles.dateBtn}>
          <Ionicons name="calendar-outline" size={19} color={colors.faint} />
          <Text style={[styles.input, { paddingVertical: 0, color: value ? colors.text : colors.faint }]}>{value ? formatDay(value) : 'No date'}</Text>
        </Pressable>
        {value && (
          <Pressable onPress={() => onChange(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Clear ${label}`} style={{ paddingHorizontal: 14 }}>
            <Ionicons name="close-circle" size={20} color={colors.faint} />
          </Pressable>
        )}
      </View>
      {Platform.OS === 'ios' && iosOpen && <DateTimePicker value={current} mode="date" display="inline" themeVariant="dark" onChange={(_e, d) => d && onChange(toISODate(d))} />}
      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={15} color="#ff9a8e" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

/** Bottom-sheet style picker used for projects, statuses and priorities. */
export function PickerField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choose…',
  error,
  disabled,
}: {
  label: string;
  value: T | '';
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => !disabled && setOpen(true)} accessibilityRole="button" accessibilityLabel={`${label}: ${selected?.label ?? 'none'}. Change`} style={[styles.inputWrap, !!error && styles.inputError, disabled && { opacity: 0.6 }]}>
        <Text style={[styles.input, { paddingVertical: 14, paddingLeft: 14, color: selected ? colors.text : colors.faint }]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.faint} style={{ marginRight: 14 }} />
      </Pressable>
      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={15} color="#ff9a8e" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={styles.sheetBackdrop} onPress={() => setOpen(false)} accessibilityLabel="Close picker" />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{label}</Text>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            style={{ maxHeight: 360 }}
            ListEmptyComponent={<Text style={[styles.hint, { padding: 16 }]}>Nothing to choose from yet.</Text>}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.sheetRow, pressed && { backgroundColor: colors.surface2 }]}
              >
                <Text style={[styles.sheetRowText, item.value === value && { color: colors.iris }]}>{item.label}</Text>
                {item.value === value && <Ionicons name="checkmark" size={20} color={colors.iris} />}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

/* ----------------------------------------------------- badges & chips */
export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}24`, borderColor: `${color}55` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}
export const StatusBadge = ({ status }: { status: TaskStatus | ProjectStatus }) => <Badge label={status} color={statusColor[status]} />;
export const PriorityBadge = ({ priority }: { priority: TaskPriority }) => <Badge label={priority} color={priorityColor[priority]} />;

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

/* --------------------------------------------------------- progress */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({ value, size = 150, stroke = 12, label, sublabel }: { value: number; size?: number; stroke?: number; label: string; sublabel?: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  const radiusPx = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radiusPx;
  useEffect(() => {
    Animated.timing(progress, { toValue: value, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value, progress]);
  const dashOffset = progress.interpolate({ inputRange: [0, 100], outputRange: [circumference, 0] });
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityRole="progressbar" accessibilityLabel={`${value}% complete`}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.iris} />
            <Stop offset="0.55" stopColor={colors.sky} />
            <Stop offset="1" stopColor={colors.mint} />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radiusPx} stroke="rgba(255,255,255,0.09)" strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={radiusPx} stroke="url(#ring)" strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={dashOffset as unknown as number} />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: size * 0.2, color: colors.text, letterSpacing: -1 }}>{label}</Text>
        {sublabel && <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted }}>{sublabel}</Text>}
      </View>
    </View>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: value, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value, w]);
  return (
    <View style={styles.bar} accessible accessibilityRole="progressbar" accessibilityLabel={`${value}%`}>
      <Animated.View style={{ height: '100%', width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }}>
        <LinearGradient colors={color ? [color, color] : [colors.iris, colors.sky, colors.mint]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 99 }} />
      </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------ states */
export function Skeleton({ height = 20, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 0.9, duration: 800, useNativeDriver: true }), Animated.timing(v, { toValue: 0.4, duration: 800, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View accessibilityElementsHidden importantForAccessibility="no" style={[{ height, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.1)', opacity: v }, style]} />;
}

export function EmptyState({ icon, title, message, action }: { icon: IconName; title: string; message: string; action?: React.ReactNode }) {
  return (
    <FadeIn style={styles.empty}>
      <View style={styles.emptyArt}>
        <Ionicons name={icon} size={32} color={colors.iris} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{message}</Text>
      {action}
    </FadeIn>
  );
}

export function ErrorState({ message, offline, onRetry, retrying }: { message: string; offline?: boolean; onRetry?: () => void; retrying?: boolean }) {
  return (
    <FadeIn style={styles.empty}>
      <View style={[styles.emptyArt, { borderColor: 'rgba(255,122,107,.45)' }]}>
        <Ionicons name={offline ? 'cloud-offline-outline' : 'alert-circle-outline'} size={32} color={colors.flame} />
      </View>
      <Text style={styles.emptyTitle}>{offline ? 'You appear to be offline' : 'We couldn’t load this'}</Text>
      <Text style={styles.emptyText}>{message}</Text>
      {onRetry && <Button title="Try again" icon="refresh" variant="ghost" onPress={onRetry} loading={retrying} small />}
    </FadeIn>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export const Spinner = () => <ActivityIndicator color={colors.iris} />;

/* ------------------------------------------------------------- styles */
const styles = StyleSheet.create({
  btnBase: { borderRadius: radius.md, overflow: 'hidden' },
  btnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnInner: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  btnText: { color: '#fff', fontFamily: fonts.semibold, fontSize: 15.5 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 13.5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(8,12,30,0.6)' },
  inputFocused: { borderColor: colors.iris, backgroundColor: 'rgba(8,12,30,0.85)' },
  inputError: { borderColor: colors.flame },
  input: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 16, paddingVertical: 12, paddingLeft: 10, paddingRight: 8 },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, minHeight: 50 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { color: '#ff9a8e', fontFamily: fonts.body, fontSize: 13, flex: 1 },
  hint: { color: colors.faint, fontFamily: fonts.body, fontSize: 13 },
  seg: { flexDirection: 'row', padding: 4, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(8,12,30,0.6)' },
  segItem: { minHeight: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 13.5 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 25, paddingHorizontal: 10, borderRadius: 99, borderWidth: 1, alignSelf: 'flex-start' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12.5 },
  chip: { height: 38, paddingHorizontal: 15, borderRadius: 99, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  chipActive: { borderColor: 'rgba(139,125,255,0.65)', backgroundColor: 'rgba(139,125,255,0.22)' },
  chipText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 13.5 },
  bar: { height: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.09)', overflow: 'hidden' },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 48, paddingHorizontal: 24 },
  emptyArt: { width: 78, height: 78, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139,125,255,0.14)', borderWidth: 1, borderColor: 'rgba(139,125,255,0.4)', marginBottom: 6 },
  emptyTitle: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 21, textAlign: 'center' },
  emptyText: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.06)', padding: 18 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(4,7,20,0.65)' },
  sheet: { backgroundColor: '#141c42', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingBottom: 30, paddingTop: 10, borderWidth: 1, borderColor: colors.borderStrong },
  sheetHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginBottom: 14 },
  sheetTitle: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 20, marginBottom: 8, paddingHorizontal: 6 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 12, borderRadius: 12 },
  sheetRowText: { color: colors.text, fontFamily: fonts.medium, fontSize: 16 },
});
