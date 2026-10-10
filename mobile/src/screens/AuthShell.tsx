import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../theme';
import Logo from '../components/Logo';
import { FadeIn } from '../components/ui';

export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FadeIn>
            <View style={styles.brand}>
              <Logo size={42} />
              <Text style={styles.brandText}>Orbit</Text>
            </View>
            <Text style={styles.headline}>Keep every project moving.</Text>
          </FadeIn>
          <FadeIn index={2} style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {children}
          </FadeIn>
          <FadeIn index={4}>{footer}</FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 22, gap: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  brandText: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 28, letterSpacing: -0.8 },
  headline: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 40, lineHeight: 42, letterSpacing: -1.6 },
  card: { padding: 22, gap: 16, borderRadius: radius.lg + 4, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(255,255,255,0.07)' },
  title: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 26 },
  subtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, marginTop: -8, marginBottom: 2 },
});
