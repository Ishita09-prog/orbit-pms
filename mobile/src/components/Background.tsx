import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme';

const { width, height } = Dimensions.get('window');

/** A soft colour field that drifts slowly behind every screen. */
function Glow({ color, size, x, y, dx, dy, duration, opacity }: { color: string; size: number; x: number; y: number; dx: number; dy: number; duration: number; opacity: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, duration]);

  const id = `g-${color.replace('#', '')}`;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        opacity,
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
        ],
      }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

export default function Background({ children }: { children?: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Glow color="#6a5af5" size={width * 1.5} x={-width * 0.5} y={-height * 0.15} dx={70} dy={90} duration={9000} opacity={0.6} />
        <Glow color="#1fb9d6" size={width * 1.3} x={width * 0.25} y={height * 0.1} dx={-80} dy={70} duration={11000} opacity={0.34} />
        <Glow color="#2fd6a4" size={width * 1.3} x={-width * 0.2} y={height * 0.6} dx={60} dy={-80} duration={13000} opacity={0.24} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg } });
