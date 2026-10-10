import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/queries';
import { useCountUp } from '../hooks/useCountUp';
import { dueLabel, firstName, greeting } from '../lib/format';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, priorityColor, radius, statusColor } from '../theme';
import type { Task } from '../types';
import { Card, EmptyState, ErrorState, FadeIn, IconButton, PriorityBadge, ProgressRing, Skeleton } from '../components/ui';

type IconName = keyof typeof Ionicons.glyphMap;

function Stat({ icon, label, value, color, index }: { icon: IconName; label: string; value: number; color: string; index: number }) {
  const shown = useCountUp(value);
  return (
    <FadeIn index={index} style={styles.statCell}>
      <Card style={{ gap: 4, padding: 16 }}>
        <View style={[styles.statIcon, { backgroundColor: `${color}26` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.statValue} accessibilityLabel={`${label}: ${value}`}>
          {shown}
        </Text>
        <Text style={styles.statLabel}>{label}</Text>
      </Card>
    </FadeIn>
  );
}

function MiniTasks({ tasks, empty, onOpen }: { tasks: Task[]; empty: string; onOpen: (t: Task) => void }) {
  if (tasks.length === 0) return <Text style={styles.muted}>{empty}</Text>;
  return (
    <View>
      {tasks.map((t, i) => {
        const due = dueLabel(t.dueDate, t.status);
        return (
          <Pressable key={t.id} onPress={() => onOpen(t)} accessibilityRole="button" accessibilityLabel={`Open task ${t.name}`} style={[styles.miniRow, i > 0 && styles.miniBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniTitle} numberOfLines={1}>
                {t.name}
              </Text>
              <Text style={styles.miniSub} numberOfLines={1}>
                {t.projectName}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              {due && <Text style={[styles.due, due.overdue && { color: '#ff8f82' }, due.soon && { color: colors.amber }]}>{due.overdue ? `Overdue · ${due.label.replace('Due ', '')}` : due.label}</Text>}
              <PriorityBadge priority={t.priority} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function DashboardScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuth();
  const { data, isLoading, error, refetch, isFetching, isRefetching } = useDashboard();
  const [loggingOut, setLoggingOut] = useState(false);

  const openTask = (task: Task) => nav.navigate('TaskForm', { task });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.iris} colors={[colors.iris]} progressBackgroundColor="#18214a" />}
      >
        <FadeIn style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello} numberOfLines={1}>
              {greeting()}, {firstName(user?.fullName)}
            </Text>
            <Text style={styles.muted}>{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          </View>
          <IconButton
            name="log-out-outline"
            label="Log out"
            color={loggingOut ? colors.faint : colors.muted}
            onPress={async () => {
              setLoggingOut(true);
              await logout();
            }}
          />
        </FadeIn>

        {isLoading && (
          <View style={{ gap: 14 }}>
            <Skeleton height={200} style={{ borderRadius: radius.lg }} />
            <Skeleton height={120} style={{ borderRadius: radius.lg }} />
            <Skeleton height={120} style={{ borderRadius: radius.lg }} />
          </View>
        )}
        {error && !data && <ErrorState message={(error as Error).message} offline={(error as ApiError).isNetwork} onRetry={() => refetch()} retrying={isFetching} />}

        {data && data.totalProjects === 0 && <EmptyState icon="rocket-outline" title="Nothing here yet" message="Create your first project on the web app, then pull down to refresh and manage its tasks here." />}

        {data && data.totalProjects > 0 && (
          <View style={{ gap: 16 }}>
            <FadeIn index={1}>
              <Card style={styles.hero}>
                <ProgressRing value={data.completionRate} size={132} stroke={12} label={`${data.completionRate}%`} sublabel="complete" />
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={styles.heroTitle}>
                    {data.completedTasks} of {data.totalTasks} tasks done
                  </Text>
                  <Text style={styles.muted}>{data.overdueTasks > 0 ? `${data.overdueTasks} overdue — start there today.` : 'Nothing is overdue. Keep going.'}</Text>
                  <Text style={[styles.pill, { color: colors.sky }]}>{data.inProgressTasks} in progress</Text>
                </View>
              </Card>
            </FadeIn>

            <View style={styles.statGrid}>
              <Stat index={2} icon="albums-outline" label="Total projects" value={data.totalProjects} color={colors.iris} />
              <Stat index={3} icon="list-outline" label="Total tasks" value={data.totalTasks} color={colors.sky} />
              <Stat index={4} icon="checkmark-circle-outline" label="Completed tasks" value={data.completedTasks} color={colors.mint} />
              <Stat index={5} icon="hourglass-outline" label="Pending tasks" value={data.pendingTasks} color={colors.amber} />
              <Stat index={6} icon="flash-outline" label="Projects in progress" value={data.projectsInProgress} color={colors.flame} />
            </View>

            <FadeIn index={7}>
              <Card style={{ gap: 14 }}>
                <Text style={styles.cardTitle}>Open tasks by priority</Text>
                {(['High', 'Medium', 'Low'] as const).map((p) => {
                  const count = data.openTasksByPriority[p] || 0;
                  const total = Object.values(data.openTasksByPriority).reduce((a, b) => a + b, 0) || 1;
                  return (
                    <View key={p} style={{ gap: 7 }}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.legend}>{p}</Text>
                        <Text style={styles.legendValue}>{count}</Text>
                      </View>
                      <View style={styles.track}>
                        <View style={{ width: `${(count / total) * 100}%`, height: '100%', backgroundColor: priorityColor[p], borderRadius: 99 }} />
                      </View>
                    </View>
                  );
                })}
              </Card>
            </FadeIn>

            <FadeIn index={8}>
              <Card style={{ gap: 12 }}>
                <Text style={styles.cardTitle}>Projects by status</Text>
                {(Object.keys(data.projectsByStatus) as (keyof typeof data.projectsByStatus)[]).map((s) => (
                  <View key={s} style={styles.rowBetween}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: statusColor[s] }} />
                      <Text style={styles.legend}>{s}</Text>
                    </View>
                    <Text style={styles.legendValue}>{data.projectsByStatus[s]}</Text>
                  </View>
                ))}
              </Card>
            </FadeIn>

            <FadeIn index={9}>
              <Card style={{ gap: 14 }}>
                <Text style={styles.cardTitle}>Due soon</Text>
                <MiniTasks tasks={data.upcomingTasks} empty="No upcoming deadlines." onOpen={openTask} />
              </Card>
            </FadeIn>

            <FadeIn index={10}>
              <Card style={{ gap: 14 }}>
                <Text style={styles.cardTitle}>Recently updated</Text>
                <MiniTasks tasks={data.recentTasks} empty="Tasks you touch will show up here." onOpen={openTask} />
              </Card>
            </FadeIn>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18, paddingBottom: 120, gap: 18 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hello: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 30, letterSpacing: -1 },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 14.5 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 20 },
  heroTitle: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 21, lineHeight: 24 },
  pill: { fontFamily: fonts.semibold, fontSize: 13.5 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCell: { width: '48%', flexGrow: 1 },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 34, letterSpacing: -1.2 },
  statLabel: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 13.5 },
  cardTitle: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 17 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legend: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 14.5 },
  legendValue: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  track: { height: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.09)', overflow: 'hidden' },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  miniBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  miniTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15.5 },
  miniSub: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  due: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 12.5 },
});
