import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarRange, ListChecks, Pencil, Trash2 } from 'lucide-react';
import { formatRange } from '../lib/format.js';
import { ProgressBar, StatusBadge } from './ui.jsx';

export default function ProjectCard({ project, onEdit, onDelete }) {
  return (
    <motion.article
      layout
      className="card project-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
    >
      {/* The whole card is one link; the action buttons sit above it. */}
      <Link to={`/projects/${project.id}`} className="card-link" aria-label={`Open project ${project.name}`} />
      <div className="card-top">
        <StatusBadge status={project.status} />
        <div className="card-actions">
          <button type="button" className="icon-btn" onClick={() => onEdit(project)} aria-label={`Edit ${project.name}`}>
            <Pencil size={16} />
          </button>
          <button type="button" className="icon-btn danger" onClick={() => onDelete(project)} aria-label={`Delete ${project.name}`}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div>
        <h3>{project.name}</h3>
        <p className="desc">{project.description || 'No description yet.'}</p>
      </div>
      <div className="progress-line">
        <ProgressBar value={project.progress} />
        <b>{project.progress}%</b>
      </div>
      <div className="meta-row">
        <span>
          <ListChecks size={15} aria-hidden="true" />
          {project.completedTaskCount}/{project.taskCount} tasks
        </span>
        <span>
          <CalendarRange size={15} aria-hidden="true" />
          {formatRange(project.startDate, project.endDate)}
        </span>
      </div>
    </motion.article>
  );
}
