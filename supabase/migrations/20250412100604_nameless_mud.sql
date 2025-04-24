/*
  # Add Task Fields to Goal Nodes

  1. Changes
    - Add task_id column referencing tasks table
    - Add is_root boolean column with default false
    - Add unique constraint to ensure only one root node per task
    - Add foreign key constraint for task_id

  2. Security
    - Maintain existing RLS policies
    - Add validation for task ownership
*/

-- Add new columns
ALTER TABLE goal_nodes
ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_root boolean NOT NULL DEFAULT false;

-- Create unique constraint for root nodes per task
ALTER TABLE goal_nodes
ADD CONSTRAINT unique_root_per_task UNIQUE (task_id, is_root)
WHERE is_root = true;

-- Create function to validate task ownership
CREATE OR REPLACE FUNCTION validate_task_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check that task belongs to the same user
  IF NEW.task_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM tasks
      WHERE id = NEW.task_id
      AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Task must belong to the same user';
    END IF;
  END IF;

  -- Ensure only one root node per task
  IF NEW.is_root = true AND NEW.task_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM goal_nodes
      WHERE task_id = NEW.task_id
      AND is_root = true
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Only one root node allowed per task';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for task ownership validation
CREATE TRIGGER validate_task_ownership_trigger
  BEFORE INSERT OR UPDATE ON goal_nodes
  FOR EACH ROW
  EXECUTE FUNCTION validate_task_ownership();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS goal_nodes_task_id_idx ON goal_nodes(task_id);
CREATE INDEX IF NOT EXISTS goal_nodes_is_root_idx ON goal_nodes(is_root) WHERE is_root = true;