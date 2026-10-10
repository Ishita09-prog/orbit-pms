import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ListPlus, Plus, Search, SearchX } from 'lucide-react';
import { useProjects, useTasks } from '../hooks/queries.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useTaskActions } from '../hooks/useTaskActions.js';
import { TASK_PRIORITIES, TASK_STATUSES } from '../lib/constants.js';
import TaskFormModal from '../components/TaskForm.jsx';
import TaskItem from '../components/TaskItem.jsx';
import { Button, ConfirmDialog, EmptyState, ErrorState, SelectField, Skeleton } from '../components/ui.jsx';

const SORTS = {
  newest: { label: 'Newest first', sortBy: 'createdAt', order: 'desc' },
  due: { label: 'Due soonest', sortBy: 'dueDate', order: 'asc' },
  priority: { label: 'Highest priority', sortBy: 'priority', order: 'desc' },
  name: { label: 'Name A–Z', sortBy: 'name', order: 'asc' },
};
const PAGE_SIZE = 20;

export default function Tasks() {
  const actions = useTaskActions();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [projectId, setProjectId] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search.trim(), 300);
  useEffect(() => setPage(1), [debouncedSearch, status, priority, projectId, sort]);

  const projects = useProjects({ limit: 100, sortBy: 'name', order: 'asc' });
  const { data, isLoading, error, refetch, isFetching } = useTasks({
    projectId,
    search: debouncedSearch,
    status,
    priority,
    sortBy: SORTS[sort].sortBy,
    order: SORTS[sort].order,
    page,
    limit: PAGE_SIZE,
  });

  const tasks = data?.data || [];
  const pagination = data?.pagination;
  const filtering = Boolean(debouncedSearch || status || priority || projectId);
  const hasProjects = (projects.data?.pagination?.total ?? 0) > 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tasks</h1>
          <p>Every task across all of your projects.</p>
        </div>
        <div className="head-actions">
          <Button onClick={() => actions.setEditing('new')} disabled={projects.isSuccess && !hasProjects} title={projects.isSuccess && !hasProjects ? 'Create a project first' : undefined}>
            <Plus size={18} aria-hidden="true" /> New task
          </Button>
        </div>
      </div>

      <div className="toolbar">
        <div className="input-wrap">
          <Search size={18} aria-hidden="true" />
          <input className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks by name" aria-label="Search tasks by name" />
        </div>
        <div className="chips" role="group" aria-label="Filter by status">
          {['', ...TASK_STATUSES].map((s) => (
            <button key={s || 'all'} type="button" className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="toolbar-spacer" />
        <SelectField small aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="Any priority" options={TASK_PRIORITIES} />
        <SelectField small aria-label="Filter by project" value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="All projects" options={(projects.data?.data || []).map((p) => ({ value: p.id, label: p.name }))} />
        <SelectField small aria-label="Sort tasks" value={sort} onChange={(e) => setSort(e.target.value)} options={Object.entries(SORTS).map(([value, s]) => ({ value, label: s.label }))} />
      </div>

      {isLoading && (
        <div aria-busy="true" aria-label="Loading tasks">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={74} style={{ marginBottom: 10 }} />
          ))}
        </div>
      )}
      {error && !data && <ErrorState error={error} onRetry={refetch} retrying={isFetching} />}

      {data && tasks.length === 0 && !filtering && (
        <EmptyState icon={ListPlus} title="No tasks yet" action={hasProjects ? <Button onClick={() => actions.setEditing('new')}><Plus size={18} aria-hidden="true" /> Add a task</Button> : undefined}>
          {hasProjects ? 'Add your first task and it will show up here.' : 'Tasks live inside projects. Create a project first, then add tasks to it.'}
        </EmptyState>
      )}
      {data && tasks.length === 0 && filtering && (
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
                setProjectId('');
              }}
            >
              Clear filters
            </Button>
          }
        >
          No tasks match your search and filters.
        </EmptyState>
      )}

      {tasks.length > 0 && (
        <div className="task-list">
          <AnimatePresence initial={false} mode="popLayout">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} showProject onToggle={actions.toggle} onStatus={actions.setStatus} onEdit={actions.setEditing} onDelete={actions.setDeleting} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
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

      <TaskFormModal open={Boolean(actions.editing)} task={actions.editing && actions.editing !== 'new' ? actions.editing : null} onClose={() => actions.setEditing(null)} />
      <ConfirmDialog open={Boolean(actions.deleting)} title="Delete this task?" confirmLabel="Delete task" loading={actions.deleting_pending} onConfirm={actions.confirmDelete} onClose={() => actions.setDeleting(null)}>
        “{actions.deleting?.name}” will be permanently deleted.
      </ConfirmDialog>
    </>
  );
}
