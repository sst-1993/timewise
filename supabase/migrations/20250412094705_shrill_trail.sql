/*
  # Consolidate Goal Nodes Schema

  This migration ensures all goal nodes functionality is properly set up,
  consolidating previous migrations and adding any missing components.

  1. Checks
    - Only creates objects if they don't already exist
    - Preserves existing data
    - Maintains referential integrity

  2. Changes
    - Ensures table exists with all required columns
    - Creates necessary indexes
    - Sets up RLS policies
    - Adds helper functions
*/

-- Create goal_nodes table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'goal_nodes') THEN
    CREATE TABLE goal_nodes (
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
    CREATE INDEX goal_nodes_user_id_idx ON goal_nodes(user_id);
    CREATE INDEX goal_nodes_parent_id_idx ON goal_nodes(parent_id);
    CREATE INDEX goal_nodes_prerequisites_idx ON goal_nodes USING gin(prerequisites);
    CREATE INDEX goal_nodes_tree_path_idx ON goal_nodes(id, parent_id);
    CREATE INDEX goal_nodes_user_tree_idx ON goal_nodes(user_id, parent_id, id);

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
  END IF;
END $$;

-- Create or replace helper functions
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

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION update_goal_nodes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_goal_nodes_updated_at'
  ) THEN
    CREATE TRIGGER update_goal_nodes_updated_at
      BEFORE UPDATE ON goal_nodes
      FOR EACH ROW
      EXECUTE FUNCTION update_goal_nodes_updated_at();
  END IF;
END $$;