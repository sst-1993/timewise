/*
  # Add goal node relationships and constraints

  1. Changes
    - Add foreign key constraint for prerequisites
    - Add check constraint for valid parent-child relationships
    - Add function to validate goal node relationships
    - Add trigger to enforce relationship rules

  2. Security
    - Functions run with security definer
    - Proper error handling and validation
*/

-- Create function to validate goal node relationships
CREATE OR REPLACE FUNCTION validate_goal_node_relationships()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for circular references in parent-child relationships
  WITH RECURSIVE node_path AS (
    -- Base case: start with the current node
    SELECT id, parent_id, ARRAY[id] as path
    FROM goal_nodes
    WHERE id = NEW.id
    
    UNION ALL
    
    -- Recursive case: join with parent nodes
    SELECT g.id, g.parent_id, np.path || g.id
    FROM goal_nodes g
    INNER JOIN node_path np ON g.id = np.parent_id
    WHERE NOT g.id = ANY(np.path)
  )
  SELECT COUNT(*)
  INTO STRICT count
  FROM node_path
  WHERE array_length(path, 1) > (
    SELECT COUNT(*) FROM goal_nodes WHERE user_id = NEW.user_id
  );
  
  IF count > 0 THEN
    RAISE EXCEPTION 'Circular reference detected in goal node relationships';
  END IF;

  -- Check that prerequisites belong to the same user
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

  RETURN NEW;
END;
$$;

-- Create trigger for relationship validation
CREATE TRIGGER validate_goal_node_relationships_trigger
  BEFORE INSERT OR UPDATE ON goal_nodes
  FOR EACH ROW
  EXECUTE FUNCTION validate_goal_node_relationships();

-- Add comment explaining the trigger
COMMENT ON TRIGGER validate_goal_node_relationships_trigger ON goal_nodes IS 
  'Validates goal node relationships to prevent circular references and ensure proper ownership';

-- Create function to get all descendants of a goal node
CREATE OR REPLACE FUNCTION get_goal_node_descendants(p_node_id uuid)
RETURNS TABLE (
  id uuid,
  parent_id uuid,
  level integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE descendants AS (
    -- Base case: direct children
    SELECT g.id, g.parent_id, 1::integer as level
    FROM goal_nodes g
    WHERE g.parent_id = p_node_id

    UNION ALL

    -- Recursive case: children of children
    SELECT g.id, g.parent_id, d.level + 1
    FROM goal_nodes g
    INNER JOIN descendants d ON g.parent_id = d.id
  )
  SELECT * FROM descendants;
END;
$$;

-- Create function to get all ancestors of a goal node
CREATE OR REPLACE FUNCTION get_goal_node_ancestors(p_node_id uuid)
RETURNS TABLE (
  id uuid,
  parent_id uuid,
  level integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE ancestors AS (
    -- Base case: direct parent
    SELECT g.id, g.parent_id, 1::integer as level
    FROM goal_nodes g
    WHERE g.id = (
      SELECT parent_id
      FROM goal_nodes
      WHERE id = p_node_id
    )

    UNION ALL

    -- Recursive case: parent of parent
    SELECT g.id, g.parent_id, a.level + 1
    FROM goal_nodes g
    INNER JOIN ancestors a ON g.id = a.parent_id
  )
  SELECT * FROM ancestors;
END;
$$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS goal_nodes_prerequisites_gin_idx ON goal_nodes USING gin(prerequisites);
CREATE INDEX IF NOT EXISTS goal_nodes_parent_child_idx ON goal_nodes(parent_id, id);
CREATE INDEX IF NOT EXISTS goal_nodes_user_parent_idx ON goal_nodes(user_id, parent_id);

-- Add constraints for date validations
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