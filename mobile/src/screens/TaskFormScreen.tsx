import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fieldErrors, type ApiError } from '../api/client';
import { TASK_PRIORITIES, TASK_STATUSES } from '../config';
import { useToast } from '../context/ToastContext';
import { useAllProjects, useTaskMutations } from '../hooks/queries';
import { validateTask, type Errors } from '../lib/validation';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import type { TaskPriority, TaskStatus } from '../types';
import { Button, DateField, FadeIn, IconButton, PickerField, Segmented, TextField } from '../components/ui';
import { Banner } from './LoginScreen';

export default function TaskFormScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'TaskForm'>) {
  const editing = route.params?.task;
  const toast = useToast();
  const { create, update, remove } = useTaskMutations();
  const projects = useAllProjects();
  const options = useMemo(() => (projects.data?.data ?? []).map((p) => ({ value: p.id, label: p.name })), [projects.data]);

  const [values, setValues] = useState({
    projectId: editing?.projectId ?? route.params?.projectId ?? '',
    name: editing?.name ?? '',
    description: editing?.description ?? '',
    priority: (editing?.priority ?? 'Medium') as TaskPriority,
    status: (editing?.status ?? 'Pending') as TaskStatus,
    dueDate: editing?.dueDate ?? (null as string | null),
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
    const found = validateTask(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = { name: values.name.trim(), description: values.description.trim(), priority: values.priority, status: values.status, dueDate: values.dueDate };
    const done = (message: string) => () => {
      toast.success(message);
      navigation.goBack();
    };
    if (editing) update.mutate({ id: editing.id, ...body }, { onSuccess: done('Task saved'), onError: fail });
    else create.mutate({ ...body, projectId: values.projectId }, { onSuccess: done('Task created'), onError: fail });
  }

  function confirmDelete() {
    if (!editing) return;
    Alert.alert('Delete this task?', `“${editing.name}” will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(editing.id, {
            onSuccess: () => {
              toast.success('Task deleted');
              navigation.goBack();
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
          <Text style={styles.title}>{editing ? 'Edit task' : 'New task'}</Text>
          {editing ? <IconButton name="trash-outline" label="Delete task" color={colors.flame} onPress={confirmDelete} /> : <View style={{ width: 40 }} />}
        </View>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FadeIn style={{ gap: 18 }}>
            {!!formError && <Banner kind="error" text={formError} />}
            <PickerField
              label="Project"
              value={values.projectId}
              options={options}
              onChange={set('projectId')}
              placeholder={projects.isLoading ? 'Loading projects…' : options.length ? 'Choose a project' : 'Create a project first'}
              error={errors.projectId}
              disabled={!!editing}
            />
            <TextField label="Task name" value={values.name} onChangeText={set('name')} error={errors.name} placeholder="What needs doing?" maxLength={160} />
            <TextField label="Description" value={values.description} onChangeText={set('description')} error={errors.description} placeholder="Add details (optional)" multiline />
            <Segmented label="Priority" options={TASK_PRIORITIES} value={values.priority} onChange={set('priority')} />
            <Segmented label="Status" options={TASK_STATUSES} value={values.status} onChange={set('status')} />
            <DateField label="Due date" value={values.dueDate} onChange={set('dueDate')} error={errors.dueDate} />
            <Button title={editing ? 'Save changes' : 'Create task'} onPress={submit} loading={create.isPending || update.isPending} disabled={busy} />
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
