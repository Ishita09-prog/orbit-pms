import { useState } from 'react';
import { fieldErrors } from '../api/client.js';
import { useProjectMutations } from '../hooks/queries.js';
import { useToast } from '../context/ToastContext.jsx';
import { PROJECT_STATUSES } from '../lib/constants.js';
import { validateProject } from '../lib/validation.js';
import { Button, Modal, Segmented, TextArea, TextField } from './ui.jsx';

function ProjectForm({ project, onClose, onSaved }) {
  const toast = useToast();
  const { create, update } = useProjectMutations();
  const [values, setValues] = useState({
    name: project?.name ?? '',
    description: project?.description ?? '',
    status: project?.status ?? 'Not Started',
    startDate: project?.startDate ?? '',
    endDate: project?.endDate ?? '',
  });
  const [errors, setErrors] = useState({});
  const saving = create.isPending || update.isPending;

  const set = (key) => (event) => {
    setValues((v) => ({ ...v, [key]: event.target.value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function submit(event) {
    event.preventDefault();
    const found = validateProject(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const body = {
      name: values.name.trim(),
      description: values.description.trim(),
      status: values.status,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
    };
    try {
      const result = project ? await update.mutateAsync({ id: project.id, ...body }) : await create.mutateAsync(body);
      toast.success(project ? 'Project updated' : 'Project created');
      onSaved?.(result.data);
      onClose();
    } catch (err) {
      const serverFields = fieldErrors(err);
      if (Object.keys(serverFields).length > 0) setErrors(serverFields);
      else toast.error(err.message);
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <TextField label="Project name" value={values.name} onChange={set('name')} error={errors.name} placeholder="e.g. Website redesign" maxLength={120} autoComplete="off" />
      <TextArea label="Description" value={values.description} onChange={set('description')} error={errors.description} placeholder="What is this project about?" rows={3} />
      <Segmented label="Status" options={PROJECT_STATUSES} value={values.status} onChange={(status) => setValues((v) => ({ ...v, status }))} full />
      <div className="form-row">
        <TextField label="Start date" type="date" value={values.startDate} onChange={set('startDate')} error={errors.startDate} />
        <TextField label="End date" type="date" value={values.endDate} onChange={set('endDate')} error={errors.endDate} min={values.startDate || undefined} />
      </div>
      <div className="modal-actions">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {project ? 'Save changes' : 'Create project'}
        </Button>
      </div>
    </form>
  );
}

export default function ProjectFormModal({ open, project, onClose, onSaved }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? 'Edit project' : 'New project'}
      description={project ? undefined : 'Give it a name now — you can add tasks right after.'}
    >
      <ProjectForm project={project} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}
