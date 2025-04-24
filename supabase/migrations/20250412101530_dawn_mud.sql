/*
  # Add goal tree functionality

  1. Changes
    - Add goal_id and is_root columns to goal_nodes table
    - Add unique constraint for root nodes per goal
    - Add validation for goal ownership
    - Add indexes for performance

  2. Security
    - Ensure proper ownership validation
    - Maintain RLS policies
*/

-- Add goal_id and is_root columns
ALTER TABLE goal_nodes
ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES goals(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_root boolean NOT NULL DEFAULT false;

-- Create unique constraint for root nodes per goal
ALTER TABLE goal_nodes
ADD CONSTRAINT unique_root_per_goal UNIQUE (goal_id, is_root)
WHERE is_root = true;

-- Create function to validate goal ownership
CREATE OR REPLACE FUNCTION validate_goal_ownership()
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

  RETURN NEW;
END;
$$;

-- Create trigger for goal ownership validation
CREATE TRIGGER validate_goal_ownership_trigger
  BEFORE INSERT OR UPDATE ON goal_nodes
  FOR EACH ROW
  EXECUTE FUNCTION validate_goal_ownership();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS goal_nodes_goal_id_idx ON goal_nodes(goal_id);
CREATE INDEX IF NOT EXISTS goal_nodes_is_root_idx ON goal_nodes(is_root) WHERE is_root = true;