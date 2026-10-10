import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, CircleDashed, FolderKanban, FolderOpen, ListTodo, Plus, Rocket } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useDashboard } from '../hooks/queries.js';
import { useCountUp } from '../hooks/useCountUp.js';
import { PRIORITY_TONE, STATUS_TONE } from '../lib/constants.js';
import { dueLabel, firstName, greeting } from '../lib/format.js';
import ProjectFormModal from '../components/ProjectForm.jsx';
import { Button, EmptyState, ErrorState, PriorityBadge, ProgressRing, Skeleton } from '../components/ui.jsx';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };

function StatCard({ icon: Icon, label, value, tone, wide }) {
  const shown = useCountUp(value);
  return (
    <motion.div variants={item} className={`card stat tone-${tone} ${wide ? 'wide' : ''}`}>
      <div className="stat-icon">
        <Icon size={20} aria-hidden="true" />
      </div>
      <strong aria-label={`${label}: ${value}`}>{shown}</strong>
      <span>{label}</span>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dash-grid" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton height={220} style={{ gridColumn: 'span 12', borderRadius: 22 }} />
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={170} style={{ gridColumn: 'span 3', borderRadius: 22 }} />
      ))}
      <Skeleton height={260} style={{ gridColumn: 'span 6', borderRadius: 22 }} />
      <Skeleton height={260} style={{ gridColumn: 'span 6', borderRadius: 22 }} />
    </div>
  );
}

function TaskMiniList({ tasks, empty }) {
  if (tasks.length === 0) return <p className="muted">{empty}</p>;
  return (
    <div className="mini-list">
      {tasks.map((task) => {
        const due = dueLabel(task.dueDate, task.status);
        return (
          <div className="mini-row" key={task.id}>
            <div className="title">
              <strong>{task.name}</strong>
              <Link to={`/projects/${task.projectId}`} className="muted">
                {task.projectName}
              </Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {due && <span className={`due ${due.overdue ? 'overdue' : due.soon ? 'soon' : ''}`}>{due.overdue ? `Overdue · ${due.label.replace('Due ', '')}` : due.label}</span>}
              <PriorityBadge priority={task.priority} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch, isFetching } = useDashboard();
  const [creating, setCreating] = useState(false);

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>
            {greeting()}, {firstName(user?.fullName)}
          </h1>
          <p>{today}</p>
        </div>
        <div className="head-actions">
          <Button onClick={() => setCreating(true)}>
            <Plus size={18} aria-hidden="true" /> New project
          </Button>
        </div>
      </div>

      {isLoading && <DashboardSkeleton />}
      {error && !data && <ErrorState error={error} onRetry={refetch} retrying={isFetching} />}

      {data && data.totalProjects === 0 && (
        <EmptyState
          icon={Rocket}
          title="Start your first project"
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus size={18} aria-hidden="true" /> Create a project
            </Button>
          }
        >
          Projects hold your tasks. Create one and your dashboard will fill up with progress, deadlines and statistics.
        </EmptyState>
      )}

      {data && data.totalProjects > 0 && (
        <motion.div className="dash-grid" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="card hero-card span-12">
            <ProgressRing value={data.completionRate} size={168} stroke={14} label={`${data.completionRate}%`} sublabel="complete" />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2>
                {data.completedTasks} of {data.totalTasks} tasks done
              </h2>
              <p className="muted">
                {data.overdueTasks > 0
                  ? `${data.overdueTasks} ${data.overdueTasks === 1 ? 'task is' : 'tasks are'} overdue — a good place to start today.`
                  : data.totalTasks === data.completedTasks && data.totalTasks > 0
                    ? 'Everything is finished. Nicely done.'
                    : 'Nothing is overdue. Keep the momentum going.'}
              </p>
              <div className="hero-mini">
                <span className="badge tone-sky">{data.inProgressTasks} in progress</span>
                <span className={`badge ${data.overdueTasks ? 'tone-flame' : 'tone-mint'}`}>{data.overdueTasks} overdue</span>
              </div>
            </div>
          </motion.div>

          <div className="span-12 stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <StatCard icon={FolderKanban} label="Total projects" value={data.totalProjects} tone="iris" />
            <StatCard icon={ListTodo} label="Total tasks" value={data.totalTasks} tone="sky" />
            <StatCard icon={CheckCircle2} label="Completed tasks" value={data.completedTasks} tone="mint" />
            <StatCard icon={CircleDashed} label="Pending tasks" value={data.pendingTasks} tone="amber" />
            <StatCard icon={FolderOpen} label="Projects in progress" value={data.projectsInProgress} tone="flame" />
          </div>

          <motion.div variants={item} className="card card-pad span-6">
            <h3 className="card-title">Projects by status</h3>
            <div className="stack-bar" aria-hidden="true">
              {Object.entries(data.projectsByStatus)
                .filter(([, n]) => n > 0)
                .map(([status, n]) => (
                  <motion.div key={status} className={`tone-${STATUS_TONE[status]}`} initial={{ flexGrow: 0 }} animate={{ flexGrow: n }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
                ))}
            </div>
            <div className="legend">
              {Object.entries(data.projectsByStatus).map(([status, n]) => (
                <div className={`legend-row tone-${STATUS_TONE[status]}`} key={status}>
                  <span>
                    <i />
                    {status}
                  </span>
                  <b>{n}</b>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={item} className="card card-pad span-6">
            <h3 className="card-title">Open tasks by priority</h3>
            <div className="legend">
              {['High', 'Medium', 'Low'].map((priority) => {
                const count = data.openTasksByPriority[priority] || 0;
                const open = Object.values(data.openTasksByPriority).reduce((a, b) => a + b, 0) || 1;
                return (
                  <div key={priority} className={`tone-${PRIORITY_TONE[priority]}`}>
                    <div className="legend-row" style={{ marginBottom: 7 }}>
                      <span>
                        <i />
                        {priority}
                      </span>
                      <b>{count}</b>
                    </div>
                    <div className="bar">
                      <motion.span style={{ background: 'var(--tone)' }} initial={{ width: 0 }} animate={{ width: `${(count / open) * 100}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div variants={item} className="card card-pad span-6">
            <h3 className="card-title">
              <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <AlertTriangle size={17} color="var(--amber)" aria-hidden="true" /> Due soon
              </span>
            </h3>
            <TaskMiniList tasks={data.upcomingTasks} empty="No upcoming deadlines. Add due dates to tasks to see them here." />
          </motion.div>

          <motion.div variants={item} className="card card-pad span-6">
            <h3 className="card-title">Recently updated</h3>
            <TaskMiniList tasks={data.recentTasks} empty="Tasks you touch will show up here." />
          </motion.div>
        </motion.div>
      )}

      <ProjectFormModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
