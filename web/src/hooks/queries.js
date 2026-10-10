import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';

export const useDashboard = () => useQuery({ queryKey: ['dashboard'], queryFn: async () => (await api.dashboard()).data });

export const useProjects = (params) =>
  useQuery({ queryKey: ['projects', params], queryFn: () => api.listProjects(params), placeholderData: keepPreviousData });

export const useProject = (id) =>
  useQuery({ queryKey: ['project', id], queryFn: async () => (await api.getProject(id)).data, enabled: Boolean(id) });

export const useTasks = (params, options = {}) =>
  useQuery({ queryKey: ['tasks', params], queryFn: () => api.listTasks(params), placeholderData: keepPreviousData, ...options });

/** Refresh everything that can be affected by a project or task change. */
function invalidateAll(queryClient) {
  return Promise.all(['dashboard', 'projects', 'project', 'tasks'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
}

export function useProjectMutations() {
  const queryClient = useQueryClient();
  const onSettled = () => invalidateAll(queryClient);
  return {
    create: useMutation({ mutationFn: api.createProject, onSettled }),
    update: useMutation({ mutationFn: ({ id, ...body }) => api.updateProject(id, body), onSettled }),
    remove: useMutation({ mutationFn: api.deleteProject, onSettled }),
  };
}

export function useTaskMutations() {
  const queryClient = useQueryClient();
  const onSettled = () => invalidateAll(queryClient);
  return {
    create: useMutation({ mutationFn: api.createTask, onSettled }),
    // Optimistic: the list updates instantly (checkmarks, board moves); it is rolled back if the server refuses.
    update: useMutation({
      mutationFn: ({ id, ...body }) => api.updateTask(id, body),
      onMutate: async ({ id, ...patch }) => {
        await queryClient.cancelQueries({ queryKey: ['tasks'] });
        const snapshots = queryClient.getQueriesData({ queryKey: ['tasks'] });
        queryClient.setQueriesData({ queryKey: ['tasks'] }, (old) =>
          old?.data ? { ...old, data: old.data.map((t) => (t.id === id ? { ...t, ...patch } : t)) } : old,
        );
        return { snapshots };
      },
      onError: (_err, _vars, context) => context?.snapshots?.forEach(([key, data]) => queryClient.setQueryData(key, data)),
      onSettled,
    }),
    remove: useMutation({ mutationFn: api.deleteTask, onSettled }),
  };
}
