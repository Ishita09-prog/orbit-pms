import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fieldErrors, type ApiError } from '../api/client';
import { PROJECT_STATUSES } from '../config';
import { useToast } from '../context/ToastContext';
import { useProjectMutations } from '../hooks/queries';
import { validateProject, type Errors } from '../lib/validation';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import type { ProjectStatus } from '../types';
import { Button, DateField, FadeIn, IconButton, Segmented, TextField } from '../components/ui';
import { Banner } from './LoginScreen';

export default function ProjectFormScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'ProjectForm'>) {
  const editing = route.params?.project;
  const toast = useToast();
  const { create, update, remove } = useProjectMutations();
  const [values, setValues] = useState({
    name: editing?.name ?? '',
    description: editing?.description ?? '',
    status: (editing?.status ?? 'Not Started') as ProjectStatus,
    startDate: editing?.startDate ?? (null as string | null),
    endDate: editing?.endDate ?? (null as string | null),
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const busy = create.isPending || update.isPending || remove.isPending;

  const set = <K extends keyof typeof values>(key: K) => (value: (typeof values)[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setFormError('');
  };
  const fail = (err: unknown) => {
    const server = fieldErrors(err);
    if (Object.keys(server).length) setErrors(server);
    else setFormError((err as ApiError).message);
  };

  function submit() {
    const found = validateProject(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = { ...values, name: values.name.trim(), description: values.description.trim() };
    const done = (message: string) => () => {
      toast.success(message);
      navigation.goBack();
    };
    if (editing) update.mutate({ id: editing.id, ...body }, { onSuccess: done('Project saved'), onError: fail });
    else create.mutate(body, { onSuccess: done('Project created'), onError: fail });
  }

  function confirmDelete() {
    if (!editing) return;
    Alert.alert('Delete this project?', `“${editing.name}” and all of its ${editing.taskCount} tasks will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(editing.id, {
            onSuccess: () => {
              toast.success('Project deleted');
              navigation.popToTop();
            },
            onError: fail,
          }),
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.bar}>
          <IconButton name="close" label="Close" color={colors.text} onPress={() => navigation.goBack()} />
          <Text style={styles.title}>{editing ? 'Edit project' : 'New project'}</Text>
          {editing ? <IconButton name="trash-outline" label="Delete project" color={colors.flame} onPress={confirmDelete} /> : <View style={{ width: 40 }} />}
        </View>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FadeIn style={{ gap: 18 }}>
            {!!formError && <Banner kind="error" text={formError} />}
            <TextField label="Project name" value={values.name} onChangeText={set('name')} error={errors.name} placeholder="e.g. Website redesign" maxLength={120} />
            <TextField label="Description" value={values.description} onChangeText={set('description')} error={errors.description} placeholder="What is this project about? (optional)" multiline />
            <Segmented label="Status" options={PROJECT_STATUSES} value={values.status} onChange={set('status')} />
            <DateField label="Start date" value={values.startDate} onChange={set('startDate')} error={errors.startDate} />
            <DateField label="End date" value={values.endDate} onChange={set('endDate')} error={errors.endDate} />
            <Button title={editing ? 'Save changes' : 'Create project'} onPress={submit} loading={create.isPending || update.isPending} disabled={busy} />
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 6 },
  title: { flex: 1, color: colors.text, fontFamily: fonts.displayBold, fontSize: 24, letterSpacing: -0.6 },
  form: { padding: 18, paddingBottom: 60 },
});
