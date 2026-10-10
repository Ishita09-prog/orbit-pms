import { query } from '../db/pool.js';
import { toTask } from './taskService.js';

/**
 * Everything on the dashboard is computed for the authenticated user only.
 * Definitions: "pending" = tasks whose status is Pending (not started); "in progress" is reported separately.
 */
export async function getDashboard(userId) {
  const [counts, byPriority, upcoming, recent] = await Promise.all([
    query(
      `SELECT
         (SELECT COUNT(*) FROM projects WHERE user_id = $1)::int                                    AS total_projects,
         (SELECT COUNT(*) FROM projects WHERE user_id = $1 AND status = 'In Progress')::int         AS projects_in_progress,
         (SELECT COUNT(*) FROM projects WHERE user_id = $1 AND status = 'Completed')::int           AS projects_completed,
         (SELECT COUNT(*) FROM projects WHERE user_id = $1 AND status = 'Not Started')::int         AS projects_not_started,
         COUNT(t.id)::int                                                                           AS total_tasks,
         (COUNT(t.id) FILTER (WHERE t.status = 'Completed'))::int                                   AS completed_tasks,
         (COUNT(t.id) FILTER (WHERE t.status = 'Pending'))::int                                     AS pending_tasks,
         (COUNT(t.id) FILTER (WHERE t.status = 'In Progress'))::int                                 AS in_progress_tasks,
         (COUNT(t.id) FILTER (WHERE t.status <> 'Completed' AND t.due_date < CURRENT_DATE))::int    AS overdue_tasks
       FROM tasks t JOIN projects p ON p.id = t.project_id
      WHERE p.user_id = $1`,
      [userId],
    ),
    query(
      `SELECT t.priority, COUNT(*)::int AS count
         FROM tasks t JOIN projects p ON p.id = t.project_id
        WHERE p.user_id = $1 AND t.status <> 'Completed' GROUP BY t.priority`,
      [userId],
    ),
    query(
      `SELECT t.id, t.project_id, p.name AS project_name, t.name, t.description, t.priority, t.status,
              t.due_date, t.created_at, t.updated_at
         FROM tasks t JOIN projects p ON p.id = t.project_id
        WHERE p.user_id = $1 AND t.status <> 'Completed' AND t.due_date IS NOT NULL
        ORDER BY t.due_date ASC, t.id LIMIT 5`,
      [userId],
    ),
    query(
      `SELECT t.id, t.project_id, p.name AS project_name, t.name, t.description, t.priority, t.status,
              t.due_date, t.created_at, t.updated_at
         FROM tasks t JOIN projects p ON p.id = t.project_id
        WHERE p.user_id = $1 ORDER BY t.updated_at DESC, t.id LIMIT 5`,
      [userId],
    ),
  ]);

  const c = counts.rows[0];
  const priorityCounts = { Low: 0, Medium: 0, High: 0 };
  for (const row of byPriority.rows) priorityCounts[row.priority] = row.count;

  return {
    totalProjects: c.total_projects,
    totalTasks: c.total_tasks,
    completedTasks: c.completed_tasks,
    pendingTasks: c.pending_tasks,
    projectsInProgress: c.projects_in_progress,
    // Extra detail used by the richer dashboards on web and mobile.
    inProgressTasks: c.in_progress_tasks,
    overdueTasks: c.overdue_tasks,
    projectsByStatus: {
      'Not Started': c.projects_not_started,
      'In Progress': c.projects_in_progress,
      Completed: c.projects_completed,
    },
    openTasksByPriority: priorityCounts,
    completionRate: c.total_tasks === 0 ? 0 : Math.round((c.completed_tasks / c.total_tasks) * 100),
    upcomingTasks: upcoming.rows.map(toTask),
    recentTasks: recent.rows.map(toTask),
  };
}
