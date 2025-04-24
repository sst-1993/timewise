/*
  # Add Goal Tree Structure

  1. New Types
    - Create goal_type enum type

  2. New Tables
    - `goal_nodes` table with the following columns:
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `parent_id` (uuid, self-referencing)
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

  3. Security
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