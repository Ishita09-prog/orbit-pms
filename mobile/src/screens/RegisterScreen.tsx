import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fieldErrors, type ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { validateRegister, type Errors } from '../lib/validation';
import { colors, fonts } from '../theme';
import { Button, TextField } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import AuthShell from './AuthShell';
import { Banner } from './LoginScreen';

export default function RegisterScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Register'>) {
  const { register } = useAuth();
  const [values, setValues] = useState({ fullName: '', email: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: 'fullName' | 'email' | 'password') => (text: string) => {
    setValues((v) => ({ ...v, [key]: text }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setFormError('');
  };

  async function submit() {
    const found = validateRegister(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setLoading(true);
    setFormError('');
    try {
      await register({ fullName: values.fullName.trim(), email: values.email.trim(), password: values.password });
    } catch (err) {
      const server = fieldErrors(err);
      if ((err as ApiError).code === 'EMAIL_TAKEN') setErrors({ email: 'An account with this email already exists. Try logging in.' });
      else if (Object.keys(server).length > 0) setErrors(server);
      else setFormError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="One account for the web and the mobile app."
      footer={
        <Pressable onPress={() => navigation.navigate('Login')} accessibilityRole="link" style={{ alignItems: 'center', padding: 8 }}>
          <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 15 }}>
            Already have an account? <Text style={{ color: colors.text, fontFamily: fonts.bold }}>Log in</Text>
          </Text>
        </Pressable>
      }
    >
      {!!formError && <Banner kind="error" text={formError} />}
      <TextField label="Full name" icon="person-outline" value={values.fullName} onChangeText={set('fullName')} error={errors.fullName} placeholder="Ada Lovelace" autoComplete="name" textContentType="name" />
      <TextField label="Email" icon="mail-outline" value={values.email} onChangeText={set('email')} error={errors.email} placeholder="you@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
      <TextField label="Password" icon="lock-closed-outline" secure value={values.password} onChangeText={set('password')} error={errors.password} hint="At least 8 characters, with a letter and a number." placeholder="Create a password" autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submit} returnKeyType="go" />
      <Button title="Create account" onPress={submit} loading={loading} />
    </AuthShell>
  );
}
