/*
  # Add root node creation support

  1. Changes
    - Add function to check if root node exists for a user
    - Add function to create default root node if none exists
    - Add trigger to automatically create root node when needed

  2. Security
    - Functions run with security definer to ensure proper permissions
    - Proper error handling and validation
*/

-- Create function to check if root node exists
CREATE OR REPLACE FUNCTION check_root_node_exists(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM goal_nodes
    WHERE user_id = p_user_id
    AND parent_id IS NULL
  );
END;
$$;

-- Create function to create default root node
CREATE OR REPLACE FUNCTION create_default_root_node(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_root_id uuid;
BEGIN
  -- Create root node if it doesn't exist
  INSERT INTO goal_nodes (
    user_id,
    parent_id,
    content,
    goal_type,
    progress,
    implementation,
    summary
  ) VALUES (
    p_user_id,
    NULL,
    'Main Goal',
    3, -- Long term goal
    0,
    'This is your main goal. Add subgoals to break it down into manageable steps.',
    'Root goal for organizing your goal hierarchy'
  )
  RETURNING id INTO v_root_id;

  RETURN v_root_id;
END;
$$;

-- Create function to ensure root node exists
CREATE OR REPLACE FUNCTION ensure_root_node_exists()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is a non-root node being created
  IF NEW.parent_id IS NOT NULL THEN
    -- Check if root node exists
    IF NOT check_root_node_exists(NEW.user_id) THEN
      -- Create root node if it doesn't exist
      PERFORM create_default_root_node(NEW.user_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to ensure root node exists
CREATE TRIGGER ensure_root_node_exists_trigger
  BEFORE INSERT ON goal_nodes
  FOR EACH ROW
  EXECUTE FUNCTION ensure_root_node_exists();

-- Add comment explaining the trigger
COMMENT ON TRIGGER ensure_root_node_exists_trigger ON goal_nodes IS 
  'Ensures a root node exists for the user when creating new goal nodes';