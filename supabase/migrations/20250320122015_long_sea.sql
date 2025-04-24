/*
  # Create function to add sample tasks for a user

  1. Changes
    - Creates a function that can be called to insert sample tasks for a specific user
    - Function takes user_id as parameter
    - Inserts 20 sample tasks with varied:
      - Titles and descriptions
      - Priorities (low, medium, high)
      - Statuses (todo, in-progress, completed)
      - Due dates (within current week)
      - Estimated times
      - Progress values
*/

-- Create function to add sample tasks for a user
CREATE OR REPLACE FUNCTION add_sample_tasks(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert sample tasks for the current week
  INSERT INTO tasks (
    user_id,
    title,
    description,
    status,
    priority,
    due_date,
    estimated_minutes,
    progress,
    start_time,
    completed_at
  ) VALUES
    -- Monday Tasks
    (p_user_id, 'Weekly Team Meeting', 'Review project progress and discuss upcoming milestones', 'completed', 'high', CURRENT_DATE + INTERVAL '0 days', 60, 100, CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
    (p_user_id, 'Client Presentation Prep', 'Prepare slides and demo for client meeting', 'in-progress', 'high', CURRENT_DATE + INTERVAL '0 days', 120, 75, CURRENT_TIMESTAMP - INTERVAL '1 hour', null),
    (p_user_id, 'Code Review', 'Review pull requests from team members', 'todo', 'medium', CURRENT_DATE + INTERVAL '0 days', 45, 0, null, null),
    (p_user_id, 'Documentation Update', 'Update API documentation', 'todo', 'low', CURRENT_DATE + INTERVAL '0 days', 90, 0, null, null),

    -- Tuesday Tasks
    (p_user_id, 'Feature Implementation', 'Implement new user dashboard features', 'todo', 'high', CURRENT_DATE + INTERVAL '1 days', 240, 0, null, null),
    (p_user_id, 'Bug Fixes', 'Address reported issues in the payment module', 'todo', 'medium', CURRENT_DATE + INTERVAL '1 days', 180, 0, null, null),
    (p_user_id, 'Performance Testing', 'Run and analyze performance tests', 'todo', 'medium', CURRENT_DATE + INTERVAL '1 days', 120, 0, null, null),
    (p_user_id, 'Team Training Session', 'Conduct training on new tools', 'todo', 'low', CURRENT_DATE + INTERVAL '1 days', 60, 0, null, null),

    -- Wednesday Tasks
    (p_user_id, 'Architecture Review', 'Review system architecture with tech lead', 'todo', 'high', CURRENT_DATE + INTERVAL '2 days', 90, 0, null, null),
    (p_user_id, 'Security Audit', 'Perform security review of new features', 'todo', 'high', CURRENT_DATE + INTERVAL '2 days', 180, 0, null, null),
    (p_user_id, 'Database Optimization', 'Optimize database queries and indexes', 'todo', 'medium', CURRENT_DATE + INTERVAL '2 days', 120, 0, null, null),
    (p_user_id, 'Code Refactoring', 'Refactor authentication module', 'todo', 'low', CURRENT_DATE + INTERVAL '2 days', 150, 0, null, null),

    -- Thursday Tasks
    (p_user_id, 'Client Meeting', 'Present project progress to client', 'todo', 'high', CURRENT_DATE + INTERVAL '3 days', 60, 0, null, null),
    (p_user_id, 'Integration Testing', 'Test integration with third-party services', 'todo', 'high', CURRENT_DATE + INTERVAL '3 days', 180, 0, null, null),
    (p_user_id, 'UI/UX Review', 'Review and update user interface designs', 'todo', 'medium', CURRENT_DATE + INTERVAL '3 days', 120, 0, null, null),
    (p_user_id, 'Documentation Review', 'Review and update technical documentation', 'todo', 'low', CURRENT_DATE + INTERVAL '3 days', 90, 0, null, null),

    -- Friday Tasks
    (p_user_id, 'Sprint Planning', 'Plan next sprint tasks and objectives', 'todo', 'high', CURRENT_DATE + INTERVAL '4 days', 120, 0, null, null),
    (p_user_id, 'Code Deployment', 'Deploy new features to production', 'todo', 'high', CURRENT_DATE + INTERVAL '4 days', 90, 0, null, null),
    (p_user_id, 'Weekly Report', 'Prepare and send weekly progress report', 'todo', 'medium', CURRENT_DATE + INTERVAL '4 days', 60, 0, null, null),
    (p_user_id, 'Team Feedback Session', 'Conduct team retrospective meeting', 'todo', 'medium', CURRENT_DATE + INTERVAL '4 days', 60, 0, null, null);
END;
$$;