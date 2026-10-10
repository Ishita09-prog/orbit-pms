import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, radius } from '../theme';
import { dueLabel } from '../lib/format';
import type { Task } from '../types';
import { PriorityBadge, StatusBadge } from './ui';

function CheckBox({ done, onPress, label }: { done: boolean; onPress: () => void; label: string }) {
  const scale = useRef(new Animated.Value(done ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: done ? 1 : 0, useNativeDriver: true, speed: 30, bounciness: 14 }).start();
  }, [done, scale]);
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={label} style={[styles.check, done && styles.checkDone]}>
      <Animated.View style={{ transform: [{ scale }], opacity: scale }}>
        <Ionicons name="checkmark" size={18} color="#07101f" />
      </Animated.View>
    </Pressable>
  );
}

export default function TaskRow({ task, showProject, onPress, onToggle }: { task: Task; showProject?: boolean; onPress: (t: Task) => void; onToggle: (t: Task) => void }) {
  const done = task.status === 'Completed';
  const due = dueLabel(task.dueDate, task.status);
  return (
    <Pressable onPress={() => onPress(task)} accessibilityRole="button" accessibilityLabel={`Edit task ${task.name}`} style={({ pressed }) => [styles.row, pressed && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
      <CheckBox
        done={done}
        label={done ? `Mark ${task.name} as not completed` : `Mark ${task.name} as completed`}
        onPress={() => {
          Haptics.impactAsync(done ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          onToggle(task);
        }}
      />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[styles.name, done && styles.nameDone]} numberOfLines={2}>
          {task.name}
        </Text>
        {!!task.description && (
          <Text style={styles.desc} numberOfLines={1}>
            {task.description}
          </Text>
        )}
        <View style={styles.tags}>
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
          {due && (
            <View style={styles.dueWrap}>
              <Ionicons name="calendar-outline" size={13} color={due.overdue ? '#ff8f82' : due.soon ? colors.amber : colors.muted} />
              <Text style={[styles.due, due.overdue && { color: '#ff8f82' }, due.soon && { color: colors.amber }]}>{due.overdue ? `Overdue · ${due.label.replace('Due ', '')}` : due.label}</Text>
            </View>
          )}
        </View>
        {showProject && (
          <View style={styles.dueWrap}>
            <Ionicons name="folder-open-outline" size={13} color={colors.muted} />
            <Text style={styles.project} numberOfLines={1}>
              {task.projectName}
            </Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 10 },
  check: { width: 28, height: 28, borderRadius: 9, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.mint, borderColor: colors.mint },
  name: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  nameDone: { color: colors.faint, textDecorationLine: 'line-through' },
  desc: { color: colors.muted, fontFamily: fonts.body, fontSize: 13.5 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  dueWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  due: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 13 },
  project: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 12.5, flexShrink: 1 },
});
