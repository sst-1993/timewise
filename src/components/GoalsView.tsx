import React, { useState } from 'react';
import { Goal, GoalDimension, GoalPeriod } from '../types';
import { Brain, Wallet, Users, Palette, Heart, Plus, ChevronDown, ChevronUp, Target, Edit2, X } from 'lucide-react';
import GoalModal from './GoalModal';
import GoalEditModal from './GoalEditModal';
import GoalTree from './GoalTree';

interface GoalsViewProps {
  goals: Goal[];
  onGoalCreate: (goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>) => void;
  onGoalUpdate: (goal: Goal) => void;
}

const dimensions: { id: GoalDimension; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'personal',
    label: 'Personal Growth',
    icon: <Brain className="w-5 h-5" />,
    description: 'Education, skills, and personal development'
  },
  {
    id: 'financial',
    label: 'Financial Planning',
    icon: <Wallet className="w-5 h-5" />,
    description: 'Savings, investments, and financial goals'
  },
  {
    id: 'social',
    label: 'Social Impact',
    icon: <Users className="w-5 h-5" />,
    description: 'Community involvement and social contributions'
  },
  {
    id: 'lifestyle',
    label: 'Hobbies & Lifestyle',
    icon: <Palette className="w-5 h-5" />,
    description: 'Recreation, health, and work-life balance'
  },
  {
    id: 'family',
    label: 'Family & Relationships',
    icon: <Heart className="w-5 h-5" />,
    description: 'Family bonds and personal relationships'
  }
];

const periods: { id: GoalPeriod; label: string }[] = [
  { id: 'yearly', label: 'Annual Goals' },
  { id: 'quarterly', label: 'Quarterly Goals' },
  { id: 'monthly', label: 'Monthly Goals' }
];

export default function GoalsView({ goals, onGoalCreate, onGoalUpdate }: GoalsViewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<GoalPeriod>('yearly');
  const [expandedDimensions, setExpandedDimensions] = useState<Set<GoalDimension>>(new Set(['personal']));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTreeModalOpen, setIsTreeModalOpen] = useState(false);
  const [selectedTreeGoal, setSelectedTreeGoal] = useState<Goal | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<GoalDimension | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const toggleDimension = (dimension: GoalDimension) => {
    const newExpanded = new Set(expandedDimensions);
    if (newExpanded.has(dimension)) {
      newExpanded.delete(dimension);
    } else {
      newExpanded.add(dimension);
    }
    setExpandedDimensions(newExpanded);
  };

  const getGoalsForDimension = (dimension: GoalDimension) => {
    return goals.filter(goal => goal.dimension === dimension && goal.period === selectedPeriod);
  };

  const handleAddGoal = (dimension: GoalDimension) => {
    setSelectedDimension(dimension);
    setIsModalOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsEditModalOpen(true);
  };

  const handleGoalTreeView = (goal: Goal) => {
    setSelectedTreeGoal(goal);
    setIsTreeModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Period Selection */}
      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Target className="w-6 h-6 mr-2 text-blue-600" />
            Goal Setting
          </h2>
          <div className="flex space-x-2">
            {periods.map(period => (
              <button
                key={period.id}
                onClick={() => setSelectedPeriod(period.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dimensions */}
        <div className="space-y-4">
          {dimensions.map(dimension => (
            <div
              key={dimension.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleDimension(dimension.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    dimension.id === 'personal' ? 'bg-purple-100 text-purple-600' :
                    dimension.id === 'financial' ? 'bg-green-100 text-green-600' :
                    dimension.id === 'social' ? 'bg-blue-100 text-blue-600' :
                    dimension.id === 'lifestyle' ? 'bg-orange-100 text-orange-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {dimension.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{dimension.label}</h3>
                    <p className="text-sm text-gray-500">{dimension.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddGoal(dimension.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <Plus className="w-5 h-5 text-gray-600" />
                  </button>
                  {expandedDimensions.has(dimension.id) ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {expandedDimensions.has(dimension.id) && (
                <div className="border-t border-gray-200 p-4">
                  {getGoalsForDimension(dimension.id).length > 0 ? (
                    <div className="space-y-3">
                      {getGoalsForDimension(dimension.id).map(goal => (
                        <div
                          onClick={() => handleGoalTreeView(goal)}
                          key={goal.id}
                          className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{goal.title}</h4>
                              <div className="flex items-center mt-1">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  goal.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  goal.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                  goal.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {goal.status.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-gray-500 ml-2">
                                  Due: {new Date(goal.target_date).toLocaleDateString()} 
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleEditGoal(goal)}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                              <Edit2 className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>Progress</span>
                              <span>{goal.progress}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                style={{ width: `${goal.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <p>No goals set for this dimension yet.</p>
                      <button
                        onClick={() => handleAddGoal(dimension.id)}
                        className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Add your first goal
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <GoalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDimension(null);
        }}
        onSave={onGoalCreate}
        dimension={selectedDimension}
        period={selectedPeriod}
      />
      {selectedGoal && (
        <GoalEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedGoal(null);
          }}
          onSave={onGoalUpdate}
          goal={selectedGoal}
        />
      )}
      
      {/* Goal Tree Modal */}
      {isTreeModalOpen && selectedTreeGoal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <Target className="w-6 h-6 mr-2 text-blue-600" />
                Goal Tree: {selectedTreeGoal.title}
              </h3>
              <button
                onClick={() => setIsTreeModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <GoalTree rootGoalId={selectedTreeGoal.id} userId={selectedTreeGoal.user_id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}