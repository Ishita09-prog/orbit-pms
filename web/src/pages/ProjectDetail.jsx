import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CalendarRange, ChevronLeft, ChevronRight, KanbanSquare, List, ListPlus, Pencil, Plus, Search, SearchX, Trash2 } from 'lucide-react';
import { useProject, useProjectMutations, useTasks } from '../hooks/queries.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useTaskActions } from '../hooks/useTaskActions.js';
import { useToast } from '../context/ToastContext.jsx';
import { TASK_PRIORITIES, TASK_STATUSES } from '../lib/constants.js';
import { formatRange } from '../lib/format.js';
import ProjectFormModal from '../components/ProjectForm.jsx';
import TaskBoard from '../components/TaskBoard.jsx';
import TaskFormModal from '../components/TaskForm.jsx';
import TaskItem from '../components/TaskItem.jsx';
import { Button, ConfirmDialog, EmptyState, ErrorState, ProgressRing, SelectField, Skeleton, StatusBadge } from '../components/ui.jsx';

const SORTS = {
  newest: { label: 'Newest first', sortBy: 'createdAt', order: 'desc' },
  due: { label: 'Due soonest', sortBy: 'dueDate', order: 'asc' },
  priority: { label: 'Highest priority', sortBy: 'priority', order: 'desc' },
  name: { label: 'Name A–Z', sortBy: 'name', order: 'asc' },
};
const PAGE_SIZE = 20;
const VIEW_KEY = 'orbit.taskView';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const projectQuery = useProject(id);
  const { remove: removeProject } = useProjectMutations();
  const actions = useTaskActions();

  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(VIEW_KEY) || 'list';
    } catch {
      return 'list';
    }
  });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [editingProject, setEditingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const debouncedSearch = useDebounce(search.trim(), 300);
  useEffect(() => setPage(1), [debouncedSearch, status, priority, sort, view]);
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* ignore */
    }
  }, [view]);

  const board = view === 'board';
  const tasksQuery = useTasks({
    projectId: id,
    search: debouncedSearch,
    status: board ? '' : status,
    priority,
    sortBy: SORTS[sort].sortBy,
    order: SORTS[sort].order,
    page: board ? 1 : page,
    limit: board ? 100 : PAGE_SIZE,
  });

  const project = projectQuery.data;
  const tasks = tasksQuery.data?.data || [];
  const pagination = tasksQuery.data?.pagination;
  const filtering = Boolean(debouncedSearch || status || priority);

  async function confirmDeleteProject() {
    try {
      await removeProject.mutateAsync(id);
      toast.success(`Deleted “${project.name}”`);
      navigate('/projects', { replace: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (projectQuery.isLoading) {
    return (
      <>
        <Skeleton height={190} style={{ borderRadius: 22, marginBottom: 26 }} />
        <Skeleton height={64} style={{ marginBottom: 10 }} />
        <Skeleton height={64} style={{ marginBottom: 10 }} />
        <Skeleton height={64} />
      </>
    );
  }

  if (projectQuery.error) {
    const notFound = projectQuery.error.status === 404;
    return (
      <>
        <Link to="/projects" className="back-link">
          <ArrowLeft size={16} aria-hidden="true" /> All projects
        </Link>
        {notFound ? (
          <EmptyState icon={SearchX} title="Project not found" action={<Button onClick={() => navigate('/projects')}>Back to projects</Button>}>
            This project doesn’t exist or may have been deleted.
          </EmptyState>
        ) : (
          <ErrorState error={projectQuery.error} onRetry={projectQuery.refetch} retrying={projectQuery.isFetching} />
        )}
      </>
    );
  }

  return (
    <>
      <Link to="/projects" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> All projects
      </Link>

      <motion.div className="card detail-head" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <StatusBadge status={project.status} />
          </div>
          <h1>{project.name}</h1>
          {project.description && <p className="desc">{project.description}</p>}
          <div className="detail-meta">
            <span>
              <CalendarRange size={16} aria-hidden="true" /> {formatRange(project.startDate, project.endDate)}
            </span>
            <span>
              {project.completedTaskCount} of {project.taskCount} tasks complete
            </span>
          </div>
          <div className="head-actions" style={{ marginTop: 20 }}>
            <Button variant="ghost" size="sm" onClick={() => setEditingProject(true)}>
              <Pencil size={15} aria-hidden="true" /> Edit project
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeletingProject(true)}>
              <Trash2 size={15} aria-hidden="true" /> Delete
            </Button>
          </div>
        </div>
        <ProgressRing value={project.progress} size={132} stroke={11} label={`${project.progress}%`} sublabel="done" />
      </motion.div>

      <div className="page-head" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 24 }}>Tasks</h2>
        <div className="head-actions">
          <div className="seg" role="radiogroup" aria-label="Task view">
            {[
              ['list', List, 'List'],
              ['board', KanbanSquare, 'Board'],
            ].map(([value, Icon, label]) => (
              <button key={value} type="button" role="radio" aria-checked={view === value} onClick={() => setView(value)}>
                {view === value && <motion.span layoutId="view-pill" className="seg-pill" transition={{ type: 'spring', stiffness: 520, damping: 38 }} />}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <Icon size={15} aria-hidden="true" /> {label}
                </span>
              </button>
            ))}
          </div>
          <Button onClick={() => actions.setEditing('new')}>
            <Plus size={18} aria-hidden="true" /> Add task
          </Button>
        </div>
      </div>

      <div className="toolbar">
        <div className="input-wrap">
          <Search size={18} aria-hidden="true" />
          <input className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks by name" aria-label="Search tasks by name" />
        </div>
        {!board && (
          <div className="chips" role="group" aria-label="Filter by status">
            {['', ...TASK_STATUSES].map((s) => (
              <button key={s || 'all'} type="button" className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
                {s || 'All'}
              </button>
            ))}
          </div>
        )}
        <div className="toolbar-spacer" />
        <SelectField small aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="Any priority" options={TASK_PRIORITIES} />
        {!board && <SelectField small aria-label="Sort tasks" value={sort} onChange={(e) => setSort(e.target.value)} options={Object.entries(SORTS).map(([value, s]) => ({ value, label: s.label }))} />}
      </div>

      {tasksQuery.isLoading && (
        <div aria-busy="true" aria-label="Loading tasks">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={74} style={{ marginBottom: 10 }} />
          ))}
        </div>
      )}
      {tasksQuery.error && !tasksQuery.data && <ErrorState error={tasksQuery.error} onRetry={tasksQuery.refetch} retrying={tasksQuery.isFetching} />}

      {tasksQuery.data && tasks.length === 0 && !filtering && (
        <EmptyState
          icon={ListPlus}
          title="No tasks in this project"
          action={
            <Button onClick={() => actions.setEditing('new')}>
              <Plus size={18} aria-hidden="true" /> Add the first task
            </Button>
          }
        >
          Break the work into small tasks. Tick them off and the progress ring above fills up.
        </EmptyState>
      )}
      {tasksQuery.data && tasks.length === 0 && filtering && (
        <EmptyState
          icon={SearchX}
          title="No matching tasks"
          action={
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('');
                setStatus('');
                setPriority('');
              }}
            >
              Clear filters
            </Button>
          }
        >
          No tasks match your search and filters.
        </EmptyState>
      )}

      {tasks.length > 0 && board && <TaskBoard tasks={tasks} onToggle={actions.toggle} onStatus={actions.setStatus} onEdit={actions.setEditing} onDelete={actions.setDeleting} />}
      {tasks.length > 0 && !board && (
        <div className="task-list">
          <AnimatePresence initial={false} mode="popLayout">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={actions.toggle} onStatus={actions.setStatus} onEdit={actions.setEditing} onDelete={actions.setDeleting} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {!board && pagination && pagination.totalPages > 1 && (
        <nav className="pager" aria-label="Pagination">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={16} aria-hidden="true" /> Previous
          </Button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button variant="ghost" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight size={16} aria-hidden="true" />
          </Button>
        </nav>
      )}

      <TaskFormModal open={Boolean(actions.editing)} task={actions.editing && actions.editing !== 'new' ? actions.editing : null} projectId={id} onClose={() => actions.setEditing(null)} />
      <ConfirmDialog open={Boolean(actions.deleting)} title="Delete this task?" confirmLabel="Delete task" loading={actions.deleting_pending} onConfirm={actions.confirmDelete} onClose={() => actions.setDeleting(null)}>
        “{actions.deleting?.name}” will be permanently deleted.
      </ConfirmDialog>
      <ProjectFormModal open={editingProject} project={project} onClose={() => setEditingProject(false)} />
      <ConfirmDialog open={deletingProject} title="Delete this project?" confirmLabel="Delete project" loading={removeProject.isPending} onConfirm={confirmDeleteProject} onClose={() => setDeletingProject(false)}>
        “{project.name}” and all {project.taskCount} of its tasks will be permanently deleted. This can’t be undone.
      </ConfirmDialog>
    </>
  );
}
