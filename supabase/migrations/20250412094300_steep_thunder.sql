/*
  # Add goal tree helper functions

  1. New Functions
    - `get_goal_tree`: Gets the complete goal tree for a user
    - `update_goal_progress`: Updates progress of a goal and its ancestors
    - `delete_goal_node`: Safely deletes a goal node and its descendants
    - `move_goal_node`: Moves a goal node to a new parent

  2. Security
    - All functions use SECURITY DEFINER
    - Proper search_path settings
    - Input validation
*/

-- Function to get complete goal tree
CREATE OR REPLACE FUNCTION get_goal_tree(p_user_id uuid)
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
  path uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE tree AS (
    -- Base case: root nodes
    SELECT 
      g.*,
      0 AS depth,
      ARRAY[g.id] AS path
    FROM goal_nodes g
    WHERE g.user_id = p_user_id
    AND g.parent_id IS NULL

    UNION ALL

    -- Recursive case: child nodes
    SELECT 
      g.*,
      t.depth + 1,
      t.path || g.id
    FROM goal_nodes g
    INNER JOIN tree t ON g.parent_id = t.id
    WHERE g.user_id = p_user_id
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
    t.path
  FROM tree t
  ORDER BY t.path;
END;
$$;

-- Function to update goal progress
CREATE OR REPLACE FUNCTION update_goal_progress(
  p_goal_id uuid,
  p_progress integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_parent_id uuid;
BEGIN
  -- Get user_id and parent_id
  SELECT user_id, parent_id INTO v_user_id, v_parent_id
  FROM goal_nodes
  WHERE id = p_goal_id;

  -- Update current goal's progress
  UPDATE goal_nodes
  SET 
    progress = p_progress,
    updated_at = now()
  WHERE id = p_goal_id
  AND user_id = v_user_id;

  -- Update parent's progress if it exists
  IF v_parent_id IS NOT NULL THEN
    -- Calculate average progress of all siblings
    WITH sibling_progress AS (
      SELECT AVG(progress)::integer as avg_progress
      FROM goal_nodes
      WHERE parent_id = v_parent_id
    )
    UPDATE goal_nodes
    SET 
      progress = (SELECT avg_progress FROM sibling_progress),
      updated_at = now()
    WHERE id = v_parent_id
    AND user_id = v_user_id;
  END IF;
END;
$$;

-- Function to safely delete a goal node
CREATE OR REPLACE FUNCTION delete_goal_node(
  p_goal_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete node and all its descendants
  WITH RECURSIVE descendants AS (
    -- Base case: the node itself
    SELECT id FROM goal_nodes
    WHERE id = p_goal_id
    AND user_id = p_user_id

    UNION ALL

    -- Recursive case: all children
    SELECT g.id
    FROM goal_nodes g
    INNER JOIN descendants d ON g.parent_id = d.id
    WHERE g.user_id = p_user_id
  )
  DELETE FROM goal_nodes
  WHERE id IN (SELECT id FROM descendants);
END;
$$;

-- Function to move a goal node
CREATE OR REPLACE FUNCTION move_goal_node(
  p_goal_id uuid,
  p_new_parent_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate ownership and prevent circular references
  IF NOT EXISTS (
    SELECT 1 FROM goal_nodes
    WHERE id = p_goal_id
    AND user_id = p_user_id
  ) OR NOT EXISTS (
    SELECT 1 FROM goal_nodes
    WHERE id = p_new_parent_id
    AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Invalid goal node or parent node';
  END IF;

  -- Check for circular reference
  IF p_goal_id = p_new_parent_id OR EXISTS (
    SELECT 1 FROM get_goal_node_descendants(p_goal_id)
    WHERE id = p_new_parent_id
  ) THEN
    RAISE EXCEPTION 'Cannot create circular reference in goal tree';
  END IF;

  -- Move the node
  UPDATE goal_nodes
  SET 
    parent_id = p_new_parent_id,
    updated_at = now()
  WHERE id = p_goal_id
  AND user_id = p_user_id;
END;
$$;