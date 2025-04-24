import React, { useState, useEffect } from 'react';
import { Play, Pause, StopCircle } from 'lucide-react';

interface TimeTrackerProps {
  onTimeBlockComplete: (duration: number) => void;
}

export default function TimeTracker({ onTimeBlockComplete }: TimeTrackerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0); // Store time in milliseconds
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    if (isRunning) {
      const updateTimer = (currentTime: number) => {
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        setTime(prevTime => prevTime + deltaTime);
        animationFrameId = requestAnimationFrame(updateTimer);
      };
      
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(updateTimer);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isRunning]);

  const handleStart = () => {
    if (!isRunning) {
      setStartTime(Date.now() - time);
    }
    setIsRunning(!isRunning);
  };

  const handleStop = () => {
    setIsRunning(false);
    onTimeBlockComplete(Math.floor(time / 60000));
    setTime(0);
    setStartTime(null);
  };

  const formatTime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const ms = Math.floor((milliseconds % 1000) / 10);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="text-4xl font-mono text-center mb-6">{formatTime(time)}</div>
      <div className="flex justify-center space-x-4">
        <button
          onClick={handleStart}
          className={`p-3 rounded-full ${
            isRunning ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
          }`}
        >
          {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
        <button
          onClick={handleStop}
          className="p-3 rounded-full bg-red-100 text-red-600"
          disabled={!isRunning && time === 0}
        >
          <StopCircle className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}