/*
  # Create Goal Nodes Schema

  1. New Tables
    - `goal_nodes`
      - For storing hierarchical goal structure
      - Supports parent-child relationships
      - Tracks progress and implementation details

  2. Functions
    - Tree traversal and manipulation
    - Progress calculation
    - Node validation

  3. Security
    - RLS policies for data access
    - Validation triggers
*/

-- Create goal_nodes table
CREATE TABLE IF NOT EXISTS goal_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES goal_nodes(id) ON DELETE CASCADE,
  content text NOT NULL,
  implementation text,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  goal_type integer NOT NULL,
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  completed_at date,
  prerequisites uuid[] DEFAULT ARRAY[]::uuid[],
  improvements text,
  summary text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_date_range CHECK (
    (planned_start_date IS NULL AND planned_end_date IS NULL) OR
    (planned_start_date <= planned_end_date)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS goal_nodes_user_id_idx ON goal_nodes(user_id);
CREATE INDEX IF NOT EXISTS goal_nodes_parent_id_idx ON goal_nodes(parent_id);
CREATE INDEX IF NOT EXISTS goal_nodes_prerequisites_idx ON goal_nodes USING gin(prerequisites);
CREATE INDEX IF NOT EXISTS goal_nodes_tree_path_idx ON goal_nodes(id, parent_id);
CREATE INDEX IF NOT EXISTS goal_nodes_user_tree_idx ON goal_nodes(user_id, parent_id, id);

-- Enable RLS
ALTER TABLE goal_nodes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create own goal nodes"
  ON goal_nodes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own goal nodes"
  ON goal_nodes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own goal nodes"
  ON goal_nodes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal nodes"
  ON goal_nodes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_goal_nodes_updated_at
  BEFORE UPDATE ON goal_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add date validation constraints
ALTER TABLE goal_nodes
ADD CONSTRAINT valid_completion_date
CHECK (
  completed_at IS NULL OR
  (actual_start_date IS NOT NULL AND completed_at >= actual_start_date)
);

ALTER TABLE goal_nodes
ADD CONSTRAINT valid_actual_start_date
CHECK (
  actual_start_date IS NULL OR
  planned_start_date IS NULL OR
  actual_start_date >= planned_start_date
);

-- Create helper functions
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

-- Function to validate node relationships
CREATE OR REPLACE FUNCTION validate_goal_node_relationships()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for circular references
  IF NEW.id = NEW.parent_id THEN
    RAISE EXCEPTION 'A node cannot be its own parent';
  END IF;

  -- Check that parent belongs to the same user
  IF NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM goal_nodes
      WHERE id = NEW.parent_id
      AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Parent node must belong to the same user';
    END IF;
  END IF;

  -- Check prerequisites belong to same user
  IF NEW.prerequisites IS NOT NULL AND array_length(NEW.prerequisites, 1) > 0 THEN
    IF EXISTS (
      SELECT 1
      FROM unnest(NEW.prerequisites) AS prereq_id
      LEFT JOIN goal_nodes g ON g.id = prereq_id
      WHERE g.id IS NULL OR g.user_id != NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Prerequisites must belong to the same user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for relationship validation
CREATE TRIGGER validate_goal_node_relationships_trigger
  BEFORE INSERT OR UPDATE ON goal_nodes
  FOR EACH ROW
  EXECUTE FUNCTION validate_goal_node_relationships();