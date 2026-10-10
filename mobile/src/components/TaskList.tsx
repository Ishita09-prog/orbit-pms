import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ApiError } from '../api/client';
import { TASK_PRIORITIES, TASK_STATUSES } from '../config';
import { flatten, totalOf, useInfiniteTasks } from '../hooks/queries';
import { useDebounce } from '../hooks/useDebounce';
import { useTaskActions } from '../hooks/useTaskActions';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import type { Task } from '../types';
import SearchBar from './SearchBar';
import TaskRow from './TaskRow';
import { Button, Chip, EmptyState, ErrorState, FadeIn, Skeleton } from './ui';

/** Searchable, filterable, infinitely-scrolling task list. Used by the Tasks tab and by a project's detail screen. */
export default function TaskList({ projectId, header, showProject }: { projectId?: string; header?: React.ReactElement | null; showProject?: boolean }) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { toggle } = useTaskActions();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const q = useDebounce(search.trim(), 350);
  const query = useInfiniteTasks({ projectId, search: q || undefined, status: status || undefined, priority: priority || undefined });
  const tasks = flatten(query.data);
  const filtered = !!(q || status || priority);
  const clear = () => {
    setSearch('');
    setStatus('');
    setPriority('');
  };

  const controls = (
    <View style={styles.controls}>
      {header}
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search tasks by name" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Any status" active={status === ''} onPress={() => setStatus('')} />
        {TASK_STATUSES.map((s) => (
          <Chip key={s} label={s} active={status === s} onPress={() => setStatus(status === s ? '' : s)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Any priority" active={priority === ''} onPress={() => setPriority('')} />
        {TASK_PRIORITIES.map((p) => (
          <Chip key={p} label={p} active={priority === p} onPress={() => setPriority(priority === p ? '' : p)} />
        ))}
      </ScrollView>
      <Text style={styles.count}>{query.data ? `${totalOf(query.data)} ${totalOf(query.data) === 1 ? 'task' : 'tasks'}${filtered ? ' match' : ''}` : ' '}</Text>
    </View>
  );

  if (query.error && !query.data) {
    return (
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={controls}
        ListEmptyComponent={<ErrorState message={(query.error as Error).message} offline={(query.error as ApiError).isNetwork} onRetry={() => query.refetch()} retrying={query.isFetching} />}
      />
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(t) => t.id}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={controls}
      renderItem={({ item, index }: { item: Task; index: number }) => (
        <FadeIn index={Math.min(index, 6)}>
          <TaskRow task={item} showProject={showProject} onPress={(t) => nav.navigate('TaskForm', { task: t })} onToggle={toggle} />
        </FadeIn>
      )}
      refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} tintColor={colors.iris} colors={[colors.iris]} progressBackgroundColor="#18214a" />}
      onEndReachedThreshold={0.4}
      onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={colors.iris} style={{ margin: 16 }} /> : null}
      ListEmptyComponent={
        query.isLoading ? (
          <View style={{ gap: 10 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={96} style={{ borderRadius: 14 }} />
            ))}
          </View>
        ) : filtered ? (
          <EmptyState icon="search-outline" title="No matching tasks" message="Try different words or clear the filters." action={<Button title="Clear filters" variant="ghost" small onPress={clear} />} />
        ) : (
          <EmptyState icon="checkmark-done-outline" title="No tasks yet" message="Tap the + button to add the first one." />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  controls: { gap: 12, marginBottom: 14 },
  chips: { gap: 8 },
  count: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 13.5 },
  list: { padding: 18, paddingBottom: 130, flexGrow: 1 },
});
