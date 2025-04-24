import React from 'react';
import { Clock } from 'lucide-react';

interface TimeControlProps {
  value: number | undefined;
  onChange: (minutes: number | undefined) => void;
}

interface TimePreset {
  label: string;
  minutes: number;
}

export default function TimeControl({ value, onChange }: TimeControlProps) {
  const timePresets: TimePreset[] = [
    { label: '15m', minutes: 15 },
    { label: '30m', minutes: 30 },
    { label: '1h', minutes: 60 },
    { label: '2h', minutes: 120 },
    { label: '4h', minutes: 240 },
    { label: '8h', minutes: 480 },
  ];

  const handleCustomTime = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = e.target.value ? parseInt(e.target.value, 10) : undefined;
    onChange(minutes);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {timePresets.map((preset) => (
          <button
            key={preset.minutes}
            onClick={() => onChange(preset.minutes)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              value === preset.minutes
                ? 'bg-blue-100 text-blue-700 shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">{preset.label}</span>
          </button>
        ))}
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          max="1440"
          value={value || ''}
          onChange={handleCustomTime}
          placeholder="Custom time"
          className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <span className="text-sm text-gray-600">minutes</span>
      </div>
    </div>
  );
}