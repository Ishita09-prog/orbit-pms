import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Check, FolderKanban, Pencil, Trash2 } from 'lucide-react';
import { TASK_STATUSES } from '../lib/constants.js';
import { dueLabel } from '../lib/format.js';
import { PriorityBadge, SelectField, StatusBadge } from './ui.jsx';

const BURST_COLORS = ['#34e0b5', '#5cc8ff', '#8b7dff', '#ffc15a', '#ff7a6b'];

/** A small celebratory pop when a task is completed. */
function Burst() {
  return (
    <span className="burst" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        return (
          <motion.i
            key={i}
            style={{ background: BURST_COLORS[i % BURST_COLORS.length] }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * 30, y: Math.sin(angle) * 30, opacity: 0, scale: 0.2 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          />
        );
      })}
    </span>
  );
}

export function CompleteCheck({ task, onToggle }) {
  const [burst, setBurst] = useState(false);
  const wasDone = useRef(task.status === 'Completed');
  const done = task.status === 'Completed';

  useEffect(() => {
    if (done && !wasDone.current) {
      setBurst(true);
      const timer = setTimeout(() => setBurst(false), 700);
      wasDone.current = true;
      return () => clearTimeout(timer);
    }
    wasDone.current = done;
    return undefined;
  }, [done]);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? `Mark “${task.name}” as not completed` : `Mark “${task.name}” as completed`}
      className="check"
      onClick={() => onToggle(task)}
    >
      <motion.span initial={false} animate={{ scale: done ? 1 : 0, opacity: done ? 1 : 0 }} transition={{ type: 'spring', stiffness: 600, damping: 22 }} style={{ display: 'grid' }}>
        <Check size={16} strokeWidth={3.2} aria-hidden="true" />
      </motion.span>
      {burst && <Burst />}
    </button>
  );
}

export function DueChip({ task }) {
  const due = dueLabel(task.dueDate, task.status);
  if (!due) return null;
  return (
    <span className={`due ${due.overdue ? 'overdue' : due.soon ? 'soon' : ''}`}>
      <Calendar size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} aria-hidden="true" />
      {due.overdue ? `Overdue · ${due.label.replace('Due ', '')}` : due.label}
    </span>
  );
}

/** Row used on the project page and the all-tasks page. */
export default function TaskItem({ task, showProject, onToggle, onStatus, onEdit, onDelete }) {
  const done = task.status === 'Completed';
  return (
    <motion.div
      layout="position"
      className={`task ${done ? 'done' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
    >
      <CompleteCheck task={task} onToggle={onToggle} />
      <div className="task-body">
        <div className="task-name">{task.name}</div>
        {task.description && <div className="task-desc">{task.description}</div>}
        <div className="task-tags">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
          <DueChip task={task} />
          {showProject && (
            <Link to={`/projects/${task.projectId}`} className="chip-project">
              <FolderKanban size={13} aria-hidden="true" /> {task.projectName}
            </Link>
          )}
        </div>
      </div>
      <div className="task-side">
        <SelectField small aria-label={`Status of ${task.name}`} value={task.status} onChange={(e) => onStatus(task, e.target.value)} options={TASK_STATUSES} />
        <button type="button" className="icon-btn" onClick={() => onEdit(task)} aria-label={`Edit ${task.name}`}>
          <Pencil size={16} />
        </button>
        <button type="button" className="icon-btn danger" onClick={() => onDelete(task)} aria-label={`Delete ${task.name}`}>
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}
