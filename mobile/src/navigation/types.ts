import type { Project, Task } from '../types';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Tabs: undefined;
  ProjectDetail: { projectId: string; name?: string };
  ProjectForm: { project?: Project };
  TaskForm: { task?: Task; projectId?: string };
};

export type TabParamList = {
  Dashboard: undefined;
  Projects: undefined;
  Tasks: undefined;
};
