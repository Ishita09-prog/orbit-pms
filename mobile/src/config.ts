// EXPO_PUBLIC_* variables are inlined by Expo at build time (see .env.example).
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000').replace(/\/$/, '');

export const PROJECT_STATUSES = ['Not Started', 'In Progress', 'Completed'] as const;
export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'] as const;
export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const;
