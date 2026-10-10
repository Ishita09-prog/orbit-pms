import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fieldErrors } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { validateLogin, type Errors } from '../lib/validation';
import { colors, fonts, radius } from '../theme';
import { Button, TextField } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import AuthShell from './AuthShell';

export default function LoginScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Login'>) {
  const { login, notice, clearNotice } = useAuth();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: 'email' | 'password') => (text: string) => {
    setValues((v) => ({ ...v, [key]: text }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setFormError('');
    if (notice) clearNotice();
  };

  async function submit() {
    const found = validateLogin(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setLoading(true);
    setFormError('');
    try {
      await login({ email: values.email.trim(), password: values.password });
    } catch (err) {
      const server = fieldErrors(err);
      if (Object.keys(server).length > 0) setErrors(server);
      else setFormError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in with the same account you use on the web."
      footer={
        <Pressable onPress={() => navigation.navigate('Register')} accessibilityRole="link" style={{ alignItems: 'center', padding: 8 }}>
          <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 15 }}>
            New to Orbit? <Text style={{ color: colors.text, fontFamily: fonts.bold }}>Create an account</Text>
          </Text>
        </Pressable>
      }
    >
      {!!notice && <Banner kind="warn" text={notice} />}
      {!!formError && <Banner kind="error" text={formError} />}
      <TextField label="Email" icon="mail-outline" value={values.email} onChangeText={set('email')} error={errors.email} placeholder="you@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
      <TextField label="Password" icon="lock-closed-outline" secure value={values.password} onChangeText={set('password')} error={errors.password} placeholder="Your password" autoCapitalize="none" autoComplete="current-password" textContentType="password" onSubmitEditing={submit} returnKeyType="go" />
      <Button title="Log in" onPress={submit} loading={loading} />
    </AuthShell>
  );
}

export function Banner({ kind, text }: { kind: 'warn' | 'error'; text: string }) {
  const color = kind === 'warn' ? colors.amber : colors.flame;
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: `${color}77`, backgroundColor: `${color}1c` }}>
      <Ionicons name={kind === 'warn' ? 'information-circle' : 'alert-circle'} size={20} color={color} />
      <Text style={{ flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 14 }}>{text}</Text>
    </View>
  );
}
