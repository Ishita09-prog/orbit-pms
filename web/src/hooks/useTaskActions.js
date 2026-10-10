import { useState } from 'react';
import { useTaskMutations } from './queries.js';
import { useToast } from '../context/ToastContext.jsx';

/** Shared behaviour for every screen that lists tasks: complete, change status, edit, delete. */
export function useTaskActions() {
  const toast = useToast();
  const { update, remove } = useTaskMutations();
  const [editing, setEditing] = useState(null); // null | 'new' | task
  const [deleting, setDeleting] = useState(null);

  const setStatus = (task, status) => {
    if (task.status === status) return;
    update.mutate({ id: task.id, status }, { onError: (err) => toast.error(err.message) });
  };
  const toggle = (task) => setStatus(task, task.status === 'Completed' ? 'Pending' : 'Completed');

  async function confirmDelete() {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Task deleted');
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return { editing, setEditing, deleting, setDeleting, setStatus, toggle, confirmDelete, deleting_pending: remove.isPending };
}
