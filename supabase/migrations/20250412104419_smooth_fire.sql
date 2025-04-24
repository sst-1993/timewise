/*
  # Add goal tree functionality

  1. Changes
    - Add goal_id column to goal_nodes table
    - Add is_root column to goal_nodes table
    - Add unique constraint for root nodes per goal
    - Add function to create root node for goal
    - Add validation for root nodes

  2. Security
    - Maintain RLS policies
    - Add proper validation for goal ownership
*/

-- Add goal_id and is_root columns if they don't exist
ALTER TABLE goal_nodes
ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES goals(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_root boolean NOT NULL DEFAULT false;

-- Create unique constraint for root nodes per goal
ALTER TABLE goal_nodes
ADD CONSTRAINT unique_root_per_goal UNIQUE (goal_id, is_root)
WHERE is_root = true;

-- Create function to validate root node
CREATE OR REPLACE FUNCTION validate_root_node()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure only one root node per goal
  IF NEW.is_root = true AND NEW.goal_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM goal_nodes
      WHERE goal_id = NEW.goal_id
      AND is_root = true
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Only one root node allowed per goal';
    END IF;
  END IF;

  -- Root nodes cannot have a parent
  IF NEW.is_root = true AND NEW.parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Root nodes cannot have a parent';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for root node validation
CREATE TRIGGER validate_root_node_trigger
  BEFORE INSERT OR UPDATE ON goal_nodes
  FOR EACH ROW
  EXECUTE FUNCTION validate_root_node();

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

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS goal_nodes_goal_id_idx ON goal_nodes(goal_id);
CREATE INDEX IF NOT EXISTS goal_nodes_is_root_idx ON goal_nodes(is_root) WHERE is_root = true;