import React from 'react';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Stop } from 'react-native-svg';

export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="logo" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#8b7dff" />
          <Stop offset="1" stopColor="#34e0b5" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="32" cy="32" rx="25" ry="10" fill="none" stroke="url(#logo)" strokeWidth="4" transform="rotate(-28 32 32)" />
      <Circle cx="32" cy="32" r="9" fill="url(#logo)" />
      <Circle cx="52" cy="20" r="4" fill="#ffc15a" />
    </Svg>
  );
}
