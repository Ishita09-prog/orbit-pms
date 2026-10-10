import type { TaskPriority, TaskStatus, ProjectStatus } from './types';

export const colors = {
  bg: '#090e22',
  bg2: '#0f1733',
  surface: 'rgba(255,255,255,0.06)',
  surface2: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.11)',
  borderStrong: 'rgba(255,255,255,0.22)',
  text: '#eef1ff',
  muted: '#a3aedb',
  faint: '#7480b0',
  iris: '#8b7dff',
  irisDeep: '#6a5af5',
  mint: '#34e0b5',
  sky: '#5cc8ff',
  amber: '#ffc15a',
  flame: '#ff7a6b',
  slate: '#9aa5d6',
  panel: '#121a3a',
};

export const fonts = {
  body: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
  bold: 'InstrumentSans_700Bold',
  display: 'BricolageGrotesque_600SemiBold',
  displayBold: 'BricolageGrotesque_700Bold',
};

export const radius = { sm: 10, md: 14, lg: 22 };

export const statusColor: Record<TaskStatus | ProjectStatus, string> = {
  'Not Started': colors.slate,
  Pending: colors.slate,
  'In Progress': colors.sky,
  Completed: colors.mint,
};

export const priorityColor: Record<TaskPriority, string> = {
  Low: colors.slate,
  Medium: colors.amber,
  High: colors.flame,
};
