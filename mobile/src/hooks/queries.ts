import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Paginated, Project, ProjectInput, Task, TaskInput } from '../types';

type Params = Record<string, string | number | undefined | null>;
const PAGE_SIZE = 20;

export const useDashboard = () => useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });

export const useProject = (id: string) => useQuery({ queryKey: ['project', id], queryFn: () => api.getProject(id) });

/** Every project (up to the API maximum of 100) — used by pickers. */
export const useAllProjects = () =>
  useQuery({ queryKey: ['projects', 'all'], queryFn: () => api.listProjects({ limit: 100, sortBy: 'name', order: 'asc' }), placeholderData: keepPreviousData });

/** Infinite lists: the next page loads as the person scrolls. */
export const useInfiniteProjects = (params: Params) =>
  useInfiniteQuery({
    queryKey: ['projects', 'infinite', params],
    queryFn: ({ pageParam }) => api.listProjects({ ...params, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<Project>) => (last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });

export const useInfiniteTasks = (params: Params) =>
  useInfiniteQuery({
    queryKey: ['tasks', 'infinite', params],
    queryFn: ({ pageParam }) => api.listTasks({ ...params, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last: Paginated<Task>) => (last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });

export const flatten = <T,>(data?: InfiniteData<Paginated<T>>): T[] => data?.pages.flatMap((p) => p.data) ?? [];
export const totalOf = <T,>(data?: InfiniteData<Paginated<T>>): number => data?.pages[0]?.pagination.total ?? 0;

const refreshAll = (qc: ReturnType<typeof useQueryClient>) =>
  Promise.all(['dashboard', 'projects', 'project', 'tasks'].map((key) => qc.invalidateQueries({ queryKey: [key] })));

export function useTaskMutations() {
  const qc = useQueryClient();
  const onSettled = () => refreshAll(qc);
  return {
    create: useMutation({ mutationFn: (body: TaskInput & { projectId: string }) => api.createTask(body), onSettled }),
    // Optimistic: checkmarks and status changes show instantly and roll back if the server refuses them.
    update: useMutation({
      mutationFn: ({ id, ...body }: Partial<TaskInput> & { id: string }) => api.updateTask(id, body),
      onMutate: async ({ id, ...patch }) => {
        await qc.cancelQueries({ queryKey: ['tasks'] });
        const snapshots = qc.getQueriesData<InfiniteData<Paginated<Task>>>({ queryKey: ['tasks'] });
        qc.setQueriesData<InfiniteData<Paginated<Task>>>({ queryKey: ['tasks'] }, (old) =>
          old ? { ...old, pages: old.pages.map((page) => ({ ...page, data: page.data.map((t) => (t.id === id ? { ...t, ...patch } : t)) })) } : old,
        );
        return { snapshots };
      },
      onError: (_e, _v, ctx) => ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data)),
      onSettled,
    }),
    remove: useMutation({ mutationFn: (id: string) => api.deleteTask(id), onSettled }),
  };
}

export function useProjectMutations() {
  const qc = useQueryClient();
  const onSettled = () => refreshAll(qc);
  return {
    create: useMutation({ mutationFn: (body: ProjectInput) => api.createProject(body), onSettled }),
    update: useMutation({ mutationFn: ({ id, ...body }: ProjectInput & { id: string }) => api.updateProject(id, body), onSettled }),
    remove: useMutation({ mutationFn: (id: string) => api.deleteProject(id), onSettled }),
  };
}
