import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProject } from '../hooks/queries';
import { formatRange } from '../lib/format';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import Fab from '../components/Fab';
import TaskList from '../components/TaskList';
import { Card, IconButton, ProgressRing, Skeleton, StatusBadge } from '../components/ui';

export default function ProjectDetailScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'ProjectDetail'>) {
  const { projectId, name } = route.params;
  const { data: project, isLoading, error } = useProject(projectId);

  const header = (
    <View style={{ gap: 14 }}>
      <View style={styles.bar}>
        <IconButton name="chevron-back" label="Go back" color={colors.text} onPress={() => navigation.goBack()} />
        <Text style={styles.barTitle} numberOfLines={1}>
          {project?.name ?? name ?? 'Project'}
        </Text>
        {project && <IconButton name="create-outline" label="Edit project" color={colors.text} onPress={() => navigation.navigate('ProjectForm', { project })} />}
      </View>
      {isLoading && !project ? (
        <Skeleton height={150} style={{ borderRadius: 22 }} />
      ) : project ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <ProgressRing value={project.progress} size={96} stroke={9} label={`${project.progress}%`} />
          <View style={{ flex: 1, gap: 8 }}>
            <StatusBadge status={project.status} />
            <Text style={styles.meta}>{formatRange(project.startDate, project.endDate)}</Text>
            <Text style={styles.meta}>
              {project.completedTaskCount} of {project.taskCount} tasks done
            </Text>
          </View>
        </Card>
      ) : error ? (
        <Text style={[styles.meta, { color: colors.flame }]}>{(error as Error).message}</Text>
      ) : null}
      {!!project?.description && <Text style={styles.desc}>{project.description}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TaskList projectId={projectId} header={header} />
      <Fab label="Add task" onPress={() => navigation.navigate('TaskForm', { projectId })} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: -8 },
  barTitle: { flex: 1, color: colors.text, fontFamily: fonts.displayBold, fontSize: 24, letterSpacing: -0.6 },
  meta: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 13.5 },
  desc: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
});
