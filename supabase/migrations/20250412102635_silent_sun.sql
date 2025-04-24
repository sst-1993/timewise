/*
  # Add goal tree functionality

  1. Changes
    - Add function to get goal tree by goal ID
    - Add function to create root node for goal
    - Add trigger to automatically create root node when goal is created

  2. Security
    - Maintain RLS policies
    - Ensure proper ownership validation
*/

-- Create function to get goal tree by goal ID
CREATE OR REPLACE FUNCTION get_goal_tree_by_goal(p_goal_id uuid)
RETURNS TABLE (
  id uuid,
  parent_id uuid,
  content text,
  implementation text,
  progress integer,
  goal_type integer,
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  completed_at date,
  prerequisites uuid[],
  improvements text,
  summary text,
  depth integer,
  path uuid[],
  is_root boolean,
  goal_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE tree AS (
    -- Base case: root node for the goal
    SELECT 
      g.*,
      0 AS depth,
      ARRAY[g.id] AS path
    FROM goal_nodes g
    WHERE g.goal_id = p_goal_id
    AND g.is_root = true

    UNION ALL

    -- Recursive case: child nodes
    SELECT 
      g.*,
      t.depth + 1,
      t.path || g.id
    FROM goal_nodes g
    INNER JOIN tree t ON g.parent_id = t.id
  )
  SELECT 
    t.id,
    t.parent_id,
    t.content,
    t.implementation,
    t.progress,
    t.goal_type,
    t.planned_start_date,
    t.planned_end_date,
    t.actual_start_date,
    t.completed_at,
    t.prerequisites,
    t.improvements,
    t.summary,
    t.depth,
    t.path,
    t.is_root,
    t.goal_id
  FROM tree t
  ORDER BY t.path;
END;
$$;

-- Create function to create root node for goal
CREATE OR REPLACE FUNCTION create_goal_root_node(
  p_goal_id uuid,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal_title text;
  v_root_id uuid;
BEGIN
  -- Get goal title
  SELECT title INTO v_goal_title
  FROM goals
  WHERE id = p_goal_id
  AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found or unauthorized';
  END IF;

  -- Create root node
  INSERT INTO goal_nodes (
    user_id,
    goal_id,
    is_root,
    content,
    goal_type,
    implementation,
    summary
  ) VALUES (
    p_user_id,
    p_goal_id,
    true,
    v_goal_title,
    3,
    'Root node for goal tree',
    'Break down this goal into smaller, manageable steps'
  )
  RETURNING id INTO v_root_id;

  RETURN v_root_id;
END;
$$;

-- Create trigger function to automatically create root node
CREATE OR REPLACE FUNCTION auto_create_goal_root_node()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create root node for the new goal
  PERFORM create_goal_root_node(NEW.id, NEW.user_id);
  RETURN NEW;
END;
$$;

-- Create trigger to create root node when goal is created
CREATE TRIGGER auto_create_goal_root_node_trigger
  AFTER INSERT ON goals
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_goal_root_node();