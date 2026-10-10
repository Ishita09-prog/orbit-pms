export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export const BACKGROUND = {
  image: import.meta.env.VITE_BG_IMAGE || '',
  video: import.meta.env.VITE_BG_VIDEO || '',
};

export const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO === 'true';

export const PROJECT_STATUSES = ['Not Started', 'In Progress', 'Completed'];
export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];
export const TASK_PRIORITIES = ['Low', 'Medium', 'High'];

// One tone per status/priority, reused for badges, rings and bars. Colour is never the only signal:
// every badge also carries its text label.
export const STATUS_TONE = {
  'Not Started': 'slate',
  Pending: 'slate',
  'In Progress': 'sky',
  Completed: 'mint',
};
export const PRIORITY_TONE = { Low: 'slate', Medium: 'amber', High: 'flame' };

export const TONE_COLOR = {
  slate: '#9aa5d6',
  sky: '#5cc8ff',
  mint: '#34e0b5',
  amber: '#ffc15a',
  flame: '#ff7a6b',
  iris: '#8b7dff',
};
