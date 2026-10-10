import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import { TASK_STATUSES, STATUS_TONE } from '../lib/constants.js';
import { CompleteCheck, DueChip } from './TaskItem.jsx';
import { PriorityBadge } from './ui.jsx';

/** Three-column board. Cards glide between columns when their status changes. */
export default function TaskBoard({ tasks, onToggle, onStatus, onEdit, onDelete }) {
  return (
    <LayoutGroup>
      <div className="board">
        {TASK_STATUSES.map((status, columnIndex) => {
          const items = tasks.filter((t) => t.status === status);
          return (
            <section key={status} className="column" aria-label={`${status} tasks`}>
              <header className="column-head">
                <span className={`badge tone-${STATUS_TONE[status]}`}>{status}</span>
                <span className="count">{items.length}</span>
              </header>
              <AnimatePresence initial={false}>
                {items.map((task) => (
                  <motion.article
                    key={task.id}
                    layoutId={`card-${task.id}`}
                    className={`kcard ${status === 'Completed' ? 'done' : ''}`}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <CompleteCheck task={task} onToggle={onToggle} />
                      <div className="task-body" style={{ flex: 1 }}>
                        <div className="task-name" style={status === 'Completed' ? { color: 'var(--faint)', textDecoration: 'line-through' } : undefined}>
                          {task.name}
                        </div>
                        {task.description && <div className="task-desc">{task.description}</div>}
                      </div>
                    </div>
                    <div className="task-tags" style={{ marginTop: 0 }}>
                      <PriorityBadge priority={task.priority} />
                      <DueChip task={task} />
                    </div>
                    <div className="kcard-foot">
                      <div style={{ display: 'flex' }}>
                        <button
                          type="button"
                          className="icon-btn icon-btn-sm"
                          disabled={columnIndex === 0}
                          onClick={() => onStatus(task, TASK_STATUSES[columnIndex - 1])}
                          aria-label={columnIndex > 0 ? `Move “${task.name}” to ${TASK_STATUSES[columnIndex - 1]}` : 'Already in the first column'}
                          style={columnIndex === 0 ? { opacity: 0.3 } : undefined}
                        >
                          <ArrowLeft size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn-sm"
                          disabled={columnIndex === TASK_STATUSES.length - 1}
                          onClick={() => onStatus(task, TASK_STATUSES[columnIndex + 1])}
                          aria-label={columnIndex < TASK_STATUSES.length - 1 ? `Move “${task.name}” to ${TASK_STATUSES[columnIndex + 1]}` : 'Already in the last column'}
                          style={columnIndex === TASK_STATUSES.length - 1 ? { opacity: 0.3 } : undefined}
                        >
                          <ArrowRight size={15} />
                        </button>
                      </div>
                      <div style={{ display: 'flex' }}>
                        <button type="button" className="icon-btn icon-btn-sm" onClick={() => onEdit(task)} aria-label={`Edit ${task.name}`}>
                          <Pencil size={14} />
                        </button>
                        <button type="button" className="icon-btn icon-btn-sm danger" onClick={() => onDelete(task)} aria-label={`Delete ${task.name}`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
              {items.length === 0 && <div className="column-empty">Nothing here yet</div>}
            </section>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
