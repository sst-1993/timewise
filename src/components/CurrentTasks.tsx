import React, { useState, useEffect } from 'react';
import { Timer, Pause, StopCircle, PlayCircle } from 'lucide-react';
import { Task } from '../types';

interface CurrentTasksProps {
  tasks: Task[];
  onTaskUpdate: (task: Task) => void;
}

export default function CurrentTasks({ tasks, onTaskUpdate }: CurrentTasksProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const animationFrameId = requestAnimationFrame(function update() {
      setNow(Date.now());
      requestAnimationFrame(update);
    });

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const activeTasks = tasks.filter(task => 
    task.status === 'in-progress' && 
    task.start_time && 
    task.estimated_minutes
  );

  const getRemainingTime = (task: Task) => {
    if (!task.start_time || !task.estimated_minutes) return '00:00.00';
    
    const startTime = new Date(task.start_time).getTime();
    const endTime = startTime + (task.estimated_minutes * 60 * 1000);
    const remaining = Math.max(0, endTime - now);
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const milliseconds = Math.floor((remaining % 1000) / 10);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  if (activeTasks.length === 0) return null;

  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <PlayCircle className="w-6 h-6 mr-2 text-blue-600" />
          Active Tasks
          <span className="ml-3 text-sm font-normal text-gray-500">
            {activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''} in progress
          </span>
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTasks.map(task => (
            <div 
              key={task.id}
              className="bg-blue-50 rounded-lg border border-blue-200 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
                <div className="flex items-center space-x-2">
                  <Timer className="w-4 h-4 text-blue-600 animate-pulse" />
                  <button
                    onClick={() => onTaskUpdate({
                      ...task,
                      status: 'todo',
                      start_time: undefined,
                      updated_at: new Date().toISOString()
                    })}
                    className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                    title="Pause task"
                  >
                    <Pause className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => onTaskUpdate({
                      ...task,
                      status: 'completed',
                      completed_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    })}
                    className="p-1 hover:bg-green-100 rounded-full transition-colors"
                    title="Complete task"
                  >
                    <StopCircle className="w-4 h-4 text-green-600" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {task.estimated_minutes} minutes estimated
                </div>
                <div className="font-mono text-lg text-blue-600 font-bold">
                  {getRemainingTime(task)}
                </div>
              </div>
              <div className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-200"
                  style={{
                    width: `${Math.min(100, (task.progress || 0))}%`
                  }}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}