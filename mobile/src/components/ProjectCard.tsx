import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../theme';
import { formatRange } from '../lib/format';
import type { Project } from '../types';
import { ProgressBar, StatusBadge } from './ui';

export default function ProjectCard({ project, onPress }: { project: Project; onPress: (p: Project) => void }) {
  return (
    <Pressable onPress={() => onPress(project)} accessibilityRole="button" accessibilityLabel={`Open project ${project.name}`} style={({ pressed }) => [styles.card, pressed && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
      <View style={styles.top}>
        <Text style={styles.name} numberOfLines={2}>
          {project.name}
        </Text>
        <StatusBadge status={project.status} />
      </View>
      {!!project.description && (
        <Text style={styles.desc} numberOfLines={2}>
          {project.description}
        </Text>
      )}
      <View style={{ gap: 7 }}>
        <View style={styles.between}>
          <Text style={styles.meta}>
            {project.completedTaskCount}/{project.taskCount} tasks
          </Text>
          <Text style={styles.meta}>{project.progress}%</Text>
        </View>
        <ProgressBar value={project.progress} />
      </View>
      <View style={styles.foot}>
        <Ionicons name="calendar-outline" size={14} color={colors.muted} />
        <Text style={styles.meta}>{formatRange(project.startDate, project.endDate)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 12 },
  top: { gap: 10 },
  name: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 20, letterSpacing: -0.4 },
  desc: { color: colors.muted, fontFamily: fonts.body, fontSize: 14.5, lineHeight: 20 },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 13 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
