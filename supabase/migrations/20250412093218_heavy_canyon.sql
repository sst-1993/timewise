/*
  # Add goal nodes support

  1. New Tables
    - `goal_nodes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `parent_id` (uuid, references goal_nodes)
      - `content` (text)
      - `implementation` (text)
      - `progress` (integer)
      - `goal_type` (integer)
      - `planned_start_date` (date)
      - `planned_end_date` (date)
      - `actual_start_date` (date)
      - `completed_at` (date)
      - `prerequisites` (uuid[])
      - `improvements` (text)
      - `summary` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for CRUD operations
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