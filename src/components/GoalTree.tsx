import React, { useState, useEffect } from 'react';
import { Plus, ChevronRight, ChevronDown, Calendar, Clock, Target, Edit2, Trash2 } from 'lucide-react';
import { GoalNode } from '../types';
import GoalNodeModal from './GoalNodeModal';
import { supabase } from '../lib/supabase';

interface GoalTreeProps {
  rootGoalId?: string;
  userId: string;
}

export default function GoalTree({ rootGoalId, userId }: GoalTreeProps) {
  const [goals, setGoals] = useState<GoalNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GoalNode | null>(null);

  useEffect(() => {
    loadGoals();
  }, [rootGoalId, userId]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      setError('');

      if (!userId || !rootGoalId) {
        throw new Error('User ID and Goal ID are required');
      }

      const { data, error } = await supabase
        .rpc('get_goal_tree_by_goal', { p_goal_id: rootGoalId });
      console.log('data:'+JSON.stringify(data))

      if (error) {
        throw error;
      }

      setGoals(data || []);
      
      // Expand root node by default
      if (data?.[0]) {
        setExpandedNodes(new Set([data[0].id]));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load goals';
      setError(errorMessage);
      console.error('Error loading goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleCreateRootGoal = async (goalData: Partial<GoalNode>) => {
    try {
      const { data, error } = await supabase
        .rpc('create_goal_root_node', {
          p_goal_id: rootGoalId,
          p_user_id: userId
        });

      if (error) throw error;
      loadGoals(); // Reload the entire tree
    } catch (err) {
      console.error('Error creating root goal:', err);
      alert('Failed to create root goal');
    }
  };

  const handleAddSubgoal = async (parentId: string) => {
    try {
      const { data, error } = await supabase
        .from('goal_nodes')
        .insert({
          user_id: userId,
          parent_id: parentId,
          content: 'New Subgoal',
          goal_type: 1,
          progress: 0
        })
        .select()
        .single();

      if (error) throw error;
      setGoals(prev => [...prev, data]);
      setExpandedNodes(prev => new Set([...prev, parentId]));
    } catch (err) {
      console.error('Error adding subgoal:', err);
      alert('Failed to add subgoal');
    }
  };

  const handleNodeClick = (node: GoalNode) => {
    setSelectedNode(node);
  };

  const renderGoalNode = (node: GoalNode, level: number = 0) => {
    const children = goals.filter(g => g.parent_id === node.id);
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id} style={{ marginLeft: `${level * 24}px` }}>
        <div 
          className={`flex items-start space-x-2 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow mb-2 cursor-pointer ${
            selectedNode?.id === node.id ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => handleNodeClick(node)}
        >
          <button
            onClick={() => toggleNode(node.id)}
            className="mt-1 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            {children.length > 0 ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </button>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-900">{node.content}</h3>
              <div className="flex items-center space-x-2">
                {node.goal_id && node.is_root && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                    Root Node
                  </span>
                )}
                <button
                  onClick={() => handleAddSubgoal(node.id)}
                  className="p-1 hover:bg-blue-100 rounded-full text-blue-600 transition-colors"
                  title="Add subgoal"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {node.implementation && (
              <p className="text-sm text-gray-600 mb-2">{node.implementation}</p>
            )}

            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {node.planned_start_date && (
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>
                    {new Date(node.planned_start_date).toLocaleDateString()} -
                    {node.planned_end_date
                      ? new Date(node.planned_end_date).toLocaleDateString()
                      : 'Ongoing'}
                  </span>
                </div>
              )}
              {node.completed_at && (
                <div className="flex items-center text-green-600">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>Completed: {new Date(node.completed_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="mt-2">
              <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{node.progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${node.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {isExpanded && children.length > 0 && (
          <div className="ml-6">
            {children.map(child => renderGoalNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading goals...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-red-200 p-8">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Goals</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => loadGoals()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const rootNode = goals[0].id
    ? goals.find(g => g.id === goals[0].id)
    : goals.find(g => !g.parent_id);
  console.log('rootNodeId:'+rootGoalId);
  console.log('!rootNode:'+!rootNode);
  console.log('GoalNode.id:'+goals[0].id);

  if (!rootNode) {
    return (
      <div className="text-center py-8">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <Target className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Root Goal Found</h3>
          <p className="text-gray-600 mb-6">
            Start by creating a root goal for your goal tree. This will be the main objective from which you can create sub-goals.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Root Goal
          </button>
        </div>
        <GoalNodeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleCreateRootGoal}
        />
      </div>
    );
  }

  return (
    <>
      <div className="p-6 bg-gray-50 rounded-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Target className="w-6 h-6 mr-2 text-blue-600" />
            Goal Tree
          </h2>
        </div>
        {renderGoalNode(rootNode)}
      </div>
      <GoalNodeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateRootGoal}
      />
    </>
  );
}