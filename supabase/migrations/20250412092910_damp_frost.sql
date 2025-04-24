/*
  # Add goal node support and relationships

  1. Changes
    - Add function to get root node for a user
    - Add function to get node path to root
    - Add function to calculate node depth
    - Add function to validate node position changes
    - Add trigger to maintain tree integrity

  2. Security
    - Functions run with security definer
    - Proper error handling and validation
*/

-- Create function to get root node for a user
CREATE OR REPLACE FUNCTION get_user_root_node(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  content text,
  depth integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE node_tree AS (
    -- Get all root nodes (no parent)
    SELECT 
      n.id,
      n.content,
      0 as depth
    FROM goal_nodes n
    WHERE n.user_id = p_user_id
    AND n.parent_id IS NULL
    
    UNION ALL
    
    -- Get all children and their depth
    SELECT 
      n.id,
      n.content,
      t.depth + 1
    FROM goal_nodes n
    INNER JOIN node_tree t ON n.parent_id = t.id
  )
  SELECT * FROM node_tree;
END;
$$;

-- Create function to get path to root
CREATE OR REPLACE FUNCTION get_path_to_root(p_node_id uuid)
RETURNS TABLE (
  id uuid,
  parent_id uuid,
  depth integer,
  path uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE node_path AS (
    -- Start with the target node
    SELECT 
      n.id,
      n.parent_id,
      0 as depth,
      ARRAY[n.id] as path
    FROM goal_nodes n
    WHERE n.id = p_node_id
    
    UNION ALL
    
    -- Get parent nodes and build path
    SELECT 
      n.id,
      n.parent_id,
      p.depth + 1,
      n.id || p.path
    FROM goal_nodes n
    INNER JOIN node_path p ON n.id = p.parent_id
  )
  SELECT * FROM node_path;
END;
$$;

-- Create function to calculate node depth
CREATE OR REPLACE FUNCTION calculate_node_depth(p_node_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_depth integer;
BEGIN
  WITH RECURSIVE node_depth AS (
    -- Start with the node
    SELECT 
      id,
      parent_id,
      0 as depth
    FROM goal_nodes
    WHERE id = p_node_id
    
    UNION ALL
    
    -- Get parents and increment depth
    SELECT 
      n.id,
      n.parent_id,
      d.depth + 1
    FROM goal_nodes n
    INNER JOIN node_depth d ON n.id = d.parent_id
  )
  SELECT MAX(depth) INTO v_depth
  FROM node_depth;
  
  RETURN v_depth;
END;
$$;

-- Create function to validate node position changes
CREATE OR REPLACE FUNCTION validate_node_position_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is a position change
  IF TG_OP = 'UPDATE' AND NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
    -- Prevent moving a node to its own descendant
    IF NEW.parent_id IN (
      SELECT id FROM get_goal_node_descendants(OLD.id)
    ) THEN
      RAISE EXCEPTION 'Cannot move a node to its own descendant';
    END IF;
    
    -- Check maximum depth
    IF calculate_node_depth(NEW.parent_id) + 1 > 10 THEN
      RAISE EXCEPTION 'Maximum tree depth (10) exceeded';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for position validation
CREATE TRIGGER validate_node_position_change_trigger
  BEFORE UPDATE ON goal_nodes
  FOR EACH ROW
  EXECUTE FUNCTION validate_node_position_change();

-- Add comment explaining the trigger
COMMENT ON TRIGGER validate_node_position_change_trigger ON goal_nodes IS 
  'Validates node position changes to maintain tree integrity';

-- Create indexes for better tree traversal
CREATE INDEX IF NOT EXISTS goal_nodes_tree_path_idx ON goal_nodes(id, parent_id);
CREATE INDEX IF NOT EXISTS goal_nodes_user_tree_idx ON goal_nodes(user_id, parent_id, id);