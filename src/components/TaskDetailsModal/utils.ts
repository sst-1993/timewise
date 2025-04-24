import { Task } from '../../types';

export const getProgress = (task: Task) => {
  if (task.status === 'completed') return 100;
  if (task.status === 'todo') return 0;
  return task.progress || 50;
};

export const validateEstimatedTime = (minutes: number | undefined): string | null => {
  if (!minutes) {
    return 'Please set the estimated completion time (in minutes) before starting the task';
  }
  if (minutes > 1440) {
    return 'Estimated time cannot exceed 24 hours (1440 minutes)';
  }
  return null;
};