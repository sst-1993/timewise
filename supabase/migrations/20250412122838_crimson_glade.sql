/*
  # Add goal_id field to goal_nodes table

  1. Changes
    - Add goal_id column to goal_nodes table
    - Add foreign key constraint to goals table
    - Add index for better query performance
    - Add validation trigger for goal ownership

  2. Security
    - Ensure goal ownership validation
    - Maintain existing RLS policies
*/

-- Add goal_id column if it doesn't exist
ALTER TABLE goal_nodes
ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES goals(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS goal_nodes_goal_id_idx ON goal_nodes(goal_id);

-- Create function to validate goal ownership
CREATE OR REPLACE FUNCTION validate_goal_node_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check that goal belongs to the same user
  IF NEW.goal_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM goals
      WHERE id = NEW.goal_id
      AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Goal must belong to the same user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for goal ownership validation
CREATE TRIGGER validate_goal_node_ownership_trigger
  BEFORE INSERT OR UPDATE ON goal_nodes
  FOR EACH ROW
  EXECUTE FUNCTION validate_goal_node_ownership();

-- Add comment explaining the trigger
COMMENT ON TRIGGER validate_goal_node_ownership_trigger ON goal_nodes IS 
  'Validates that goal nodes can only be linked to goals owned by the same user';