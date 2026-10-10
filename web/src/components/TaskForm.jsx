import { useState } from 'react';
import { fieldErrors } from '../api/client.js';
import { useProjects, useTaskMutations } from '../hooks/queries.js';
import { useToast } from '../context/ToastContext.jsx';
import { TASK_PRIORITIES, TASK_STATUSES } from '../lib/constants.js';
import { validateTask } from '../lib/validation.js';
import { Button, Modal, SelectField, Segmented, TextArea, TextField } from './ui.jsx';

function TaskForm({ task, fixedProjectId, onClose }) {
  const toast = useToast();
  const { create, update } = useTaskMutations();
  const needsProjectChoice = !task && !fixedProjectId;
  const projects = useProjects({ limit: 100, sortBy: 'name', order: 'asc' });
  const [values, setValues] = useState({
    name: task?.name ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? 'Medium',
    status: task?.status ?? 'Pending',
    dueDate: task?.dueDate ?? '',
    projectId: task?.projectId ?? fixedProjectId ?? '',
  });
  const [errors, setErrors] = useState({});
  const saving = create.isPending || update.isPending;

  const set = (key) => (event) => {
    setValues((v) => ({ ...v, [key]: event.target.value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function submit(event) {
    event.preventDefault();
    const found = validateTask(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const body = {
      name: values.name.trim(),
      description: values.description.trim(),
      priority: values.priority,
      status: values.status,
      dueDate: values.dueDate || null,
    };
    try {
      if (task) await update.mutateAsync({ id: task.id, ...body });
      else await create.mutateAsync({ ...body, projectId: values.projectId });
      toast.success(task ? 'Task updated' : 'Task added');
      onClose();
    } catch (err) {
      const serverFields = fieldErrors(err);
      if (Object.keys(serverFields).length > 0) setErrors(serverFields);
      else toast.error(err.message);
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      {needsProjectChoice && (
        <SelectField
          label="Project"
          value={values.projectId}
          onChange={set('projectId')}
          error={errors.projectId}
          placeholder={projects.isLoading ? 'Loading projects…' : 'Choose a project'}
          options={(projects.data?.data || []).map((p) => ({ value: p.id, label: p.name }))}
        />
      )}
      <TextField label="Task name" value={values.name} onChange={set('name')} error={errors.name} placeholder="e.g. Write the launch announcement" maxLength={160} autoComplete="off" />
      <TextArea label="Description" value={values.description} onChange={set('description')} error={errors.description} placeholder="Add details, links or notes" rows={3} />
      <Segmented label="Priority" options={TASK_PRIORITIES} value={values.priority} onChange={(priority) => setValues((v) => ({ ...v, priority }))} full />
      <Segmented label="Status" options={TASK_STATUSES} value={values.status} onChange={(status) => setValues((v) => ({ ...v, status }))} full />
      <TextField label="Due date" type="date" value={values.dueDate} onChange={set('dueDate')} error={errors.dueDate} />
      <div className="modal-actions">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {task ? 'Save changes' : 'Add task'}
        </Button>
      </div>
    </form>
  );
}

export default function TaskFormModal({ open, task, projectId, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={task ? 'Edit task' : 'New task'}>
      <TaskForm task={task} fixedProjectId={projectId} onClose={onClose} />
    </Modal>
  );
}
