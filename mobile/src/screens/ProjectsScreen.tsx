import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ApiError } from '../api/client';
import { PROJECT_STATUSES } from '../config';
import { flatten, totalOf, useInfiniteProjects } from '../hooks/queries';
import { useDebounce } from '../hooks/useDebounce';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import Fab from '../components/Fab';
import ProjectCard from '../components/ProjectCard';
import SearchBar from '../components/SearchBar';
import { Chip, EmptyState, ErrorState, FadeIn, Skeleton } from '../components/ui';
import { Button } from '../components/ui';
import { ScrollView } from 'react-native';

export default function ProjectsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const q = useDebounce(search.trim(), 350);
  const query = useInfiniteProjects({ search: q || undefined, status: status || undefined });
  const projects = flatten(query.data);
  const filtered = !!q || !!status;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.head}>
        <FadeIn>
          <Text style={styles.title}>Projects</Text>
          <Text style={styles.sub}>{query.data ? `${totalOf(query.data)} ${totalOf(query.data) === 1 ? 'project' : 'projects'}` : ' '}</Text>
        </FadeIn>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search projects by name" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="All" active={status === ''} onPress={() => setStatus('')} />
          {PROJECT_STATUSES.map((s) => (
            <Chip key={s} label={s} active={status === s} onPress={() => setStatus(status === s ? '' : s)} />
          ))}
        </ScrollView>
      </View>

      {query.isLoading ? (
        <View style={{ padding: 18, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={150} style={{ borderRadius: 22 }} />
          ))}
        </View>
      ) : query.error && !query.data ? (
        <ErrorState message={(query.error as Error).message} offline={(query.error as ApiError).isNetwork} onRetry={() => query.refetch()} retrying={query.isFetching} />
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <FadeIn index={index}>
              <ProjectCard project={item} onPress={(p) => nav.navigate('ProjectDetail', { projectId: p.id, name: p.name })} />
            </FadeIn>
          )}
          refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} tintColor={colors.iris} colors={[colors.iris]} progressBackgroundColor="#18214a" />}
          onEndReachedThreshold={0.4}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={colors.iris} style={{ margin: 16 }} /> : null}
          ListEmptyComponent={
            filtered ? (
              <EmptyState icon="search-outline" title="No matching projects" message="Try a different name or clear the status filter." action={<Button title="Clear filters" variant="ghost" small onPress={() => { setSearch(''); setStatus(''); }} />} />
            ) : (
              <EmptyState icon="albums-outline" title="No projects yet" message="Create your first project to start organising tasks." action={<Button title="New project" icon="add" small onPress={() => nav.navigate('ProjectForm', {})} />} />
            )
          }
        />
      )}
      <Fab label="New project" onPress={() => nav.navigate('ProjectForm', {})} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 18, paddingTop: 8, gap: 12 },
  title: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 32, letterSpacing: -1.2 },
  sub: { color: colors.muted, fontFamily: fonts.body, fontSize: 14.5 },
  list: { padding: 18, paddingBottom: 130, flexGrow: 1 },
});
