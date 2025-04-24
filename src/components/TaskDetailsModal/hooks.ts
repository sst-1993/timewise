import { useState, useEffect } from 'react';
import { Task } from '../../types';

export const useRemainingTime = (task: Task | null) => {
  const [remainingTime, setRemainingTime] = useState('00:00');

  const getRemainingTime = () => {
    if (!task?.startTime || !task?.estimatedMinutes) return '00:00';
    
    const startTime = new Date(task.startTime).getTime();
    const endTime = startTime + (task.estimatedMinutes * 60 * 1000);
    const now = Date.now();
    
    if (now >= endTime) return '00:00';
    
    const remaining = endTime - now;
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const milliseconds = Math.floor((remaining % 1000) / 10);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let animationFrameId: number;

    const updateTimer = () => {
      setRemainingTime(getRemainingTime());
      animationFrameId = requestAnimationFrame(updateTimer);
    };

    if (task?.status === 'in-progress' && task?.estimatedMinutes) {
      animationFrameId = requestAnimationFrame(updateTimer);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [task?.status, task?.estimatedMinutes, task?.startTime]);

  return remainingTime;
};