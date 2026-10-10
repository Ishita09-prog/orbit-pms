import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, FolderPlus, Plus, Search, SearchX } from 'lucide-react';
import { useProjectMutations, useProjects } from '../hooks/queries.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useToast } from '../context/ToastContext.jsx';
import { PROJECT_STATUSES } from '../lib/constants.js';
import ProjectCard from '../components/ProjectCard.jsx';
import ProjectFormModal from '../components/ProjectForm.jsx';
import { Button, ConfirmDialog, EmptyState, ErrorState, SelectField, Skeleton } from '../components/ui.jsx';

const SORTS = {
  newest: { label: 'Newest first', sortBy: 'createdAt', order: 'desc' },
  oldest: { label: 'Oldest first', sortBy: 'createdAt', order: 'asc' },
  name: { label: 'Name A–Z', sortBy: 'name', order: 'asc' },
  ending: { label: 'Ending soonest', sortBy: 'endDate', order: 'asc' },
};
const PAGE_SIZE = 9;

export default function Projects() {
  const toast = useToast();
  const { remove } = useProjectMutations();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | 'new' | project
  const [deleting, setDeleting] = useState(null);

  const debouncedSearch = useDebounce(search.trim(), 300);
  useEffect(() => setPage(1), [debouncedSearch, status, sort]);

  const params = { search: debouncedSearch, status, sortBy: SORTS[sort].sortBy, order: SORTS[sort].order, page, limit: PAGE_SIZE };
  const { data, isLoading, error, refetch, isFetching, isPlaceholderData } = useProjects(params);

  const projects = data?.data || [];
  const pagination = data?.pagination;
  const filtering = Boolean(debouncedSearch || status);

  async function confirmDelete() {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(`Deleted “${deleting.name}”`);
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Projects</h1>
          <p>Everything you’re working on, with live progress.</p>
        </div>
        <div className="head-actions">
          <Button onClick={() => setEditing('new')}>
            <Plus size={18} aria-hidden="true" /> New project
          </Button>
        </div>
      </div>

      <div className="toolbar">
        <div className="input-wrap">
          <Search size={18} aria-hidden="true" />
          <input className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects by name" aria-label="Search projects by name" />
        </div>
        <div className="chips" role="group" aria-label="Filter by status">
          {['', ...PROJECT_STATUSES].map((s) => (
            <button key={s || 'all'} type="button" className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="toolbar-spacer" />
        <SelectField small aria-label="Sort projects" value={sort} onChange={(e) => setSort(e.target.value)} options={Object.entries(SORTS).map(([value, s]) => ({ value, label: s.label }))} />
      </div>

      {isLoading && (
        <div className="grid" aria-busy="true" aria-label="Loading projects">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={220} style={{ borderRadius: 22 }} />
          ))}
        </div>
      )}
      {error && !data && <ErrorState error={error} onRetry={refetch} retrying={isFetching} />}

      {data && projects.length === 0 && !filtering && (
        <EmptyState
          icon={FolderPlus}
          title="No projects yet"
          action={
            <Button onClick={() => setEditing('new')}>
              <Plus size={18} aria-hidden="true" /> Create your first project
            </Button>
          }
        >
          A project groups related tasks together. Start with one and add tasks as you go.
        </EmptyState>
      )}
      {data && projects.length === 0 && filtering && (
        <EmptyState
          icon={SearchX}
          title="No matching projects"
          action={
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('');
                setStatus('');
              }}
            >
              Clear filters
            </Button>
          }
        >
          Nothing matches your search and filters. Try a different name or status.
        </EmptyState>
      )}

      {projects.length > 0 && (
        <motion.div className="grid" animate={{ opacity: isPlaceholderData ? 0.55 : 1 }} transition={{ duration: 0.15 }}>
          <AnimatePresence mode="popLayout">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onEdit={setEditing} onDelete={setDeleting} />
            ))}
          </AnimatePresence>
        </motion.div>
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

      <ProjectFormModal open={Boolean(editing)} project={editing && editing !== 'new' ? editing : null} onClose={() => setEditing(null)} />
      <ConfirmDialog open={Boolean(deleting)} title="Delete this project?" confirmLabel="Delete project" loading={remove.isPending} onConfirm={confirmDelete} onClose={() => setDeleting(null)}>
        “{deleting?.name}” and all {deleting?.taskCount ?? 0} of its tasks will be permanently deleted. This can’t be undone.
      </ConfirmDialog>
    </>
  );
}
