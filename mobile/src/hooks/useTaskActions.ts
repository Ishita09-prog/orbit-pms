import { useCallback } from 'react';
import { useTaskMutations } from './queries';
import { useToast } from '../context/ToastContext';
import type { Task, TaskStatus } from '../types';

/** Complete / change status with optimistic updates; failures roll back and show a message. */
export function useTaskActions() {
  const toast = useToast();
  const { update } = useTaskMutations();
  const setStatus = useCallback(
    (task: Task, status: TaskStatus) => {
      if (task.status === status) return;
      update.mutate({ id: task.id, status }, { onError: (err) => toast.error((err as Error).message) });
    },
    [update, toast],
  );
  const toggle = useCallback((task: Task) => setStatus(task, task.status === 'Completed' ? 'Pending' : 'Completed'), [setStatus]);
  return { setStatus, toggle };
}
