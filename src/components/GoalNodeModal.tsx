import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { GoalNode } from '../types';

interface GoalNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goalData: Partial<GoalNode>) => void;
  goal?: GoalNode;
}

export default function GoalNodeModal({ isOpen, onClose, onSave, goal }: GoalNodeModalProps) {
  const [content, setContent] = useState('');
  const [implementation, setImplementation] = useState('');
  const [goalType, setGoalType] = useState(1);
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [improvements, setImprovements] = useState('');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (goal) {
      setContent(goal.content);
      setImplementation(goal.implementation || '');
      setGoalType(goal.goal_type);
      setPlannedStartDate(goal.planned_start_date || '');
      setPlannedEndDate(goal.planned_end_date || '');
      setImprovements(goal.improvements || '');
      setSummary(goal.summary || '');
    } else {
      resetForm();
    }
  }, [goal]);

  const resetForm = () => {
    setContent('');
    setImplementation('');
    setGoalType(1);
    setPlannedStartDate('');
    setPlannedEndDate('');
    setImprovements('');
    setSummary('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      content,
      implementation,
      goal_type: goalType,
      planned_start_date: plannedStartDate || null,
      planned_end_date: plannedEndDate || null,
      improvements,
      summary
    });
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            {goal ? 'Edit Goal' : 'New Goal'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal Content
            </label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Implementation Details
            </label>
            <textarea
              value={implementation}
              onChange={(e) => setImplementation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal Type
            </label>
            <select
              value={goalType}
              onChange={(e) => setGoalType(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Short Term</option>
              <option value={2}>Medium Term</option>
              <option value={3}>Long Term</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planned Start Date
              </label>
              <input
                type="date"
                value={plannedStartDate}
                onChange={(e) => setPlannedStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planned End Date
              </label>
              <input
                type="date"
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Improvements
            </label>
            <textarea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Summary
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {goal ? 'Save Changes' : 'Create Root Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}