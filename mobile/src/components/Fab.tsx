import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';
import { PressableScale } from './ui';

export default function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.fab}>
      <LinearGradient colors={[colors.iris, colors.irisDeep]} style={styles.inner}>
        <Ionicons name="add" size={30} color="#fff" />
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fab: { position: 'absolute', right: 20, bottom: 16, borderRadius: 20, elevation: 8, shadowColor: colors.iris, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  inner: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
