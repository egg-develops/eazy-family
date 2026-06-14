-- Multi-assignee array and list visibility control
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_to_users TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS visible_to TEXT DEFAULT 'family';

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_visible_to_check
  CHECK (visible_to IS NULL OR visible_to IN ('family', 'parents'));

CREATE INDEX IF NOT EXISTS tasks_assigned_to_users_idx
  ON public.tasks USING GIN (assigned_to_users);

-- Update the shared-task SELECT policy to honour visible_to:
-- Parents-only lists are visible only to family members with role='parent'.
DROP POLICY IF EXISTS "Family members can view shared tasks" ON public.tasks;

CREATE POLICY "Family members can view shared tasks"
ON public.tasks FOR SELECT
USING (
  type = 'shared'
  AND family_id IS NOT NULL
  AND public.user_belongs_to_family(auth.uid(), family_id)
  AND (
    visible_to IS NULL
    OR visible_to = 'family'
    OR (
      visible_to = 'parents'
      AND EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.user_id = auth.uid()
          AND fm.family_id = tasks.family_id
          AND fm.role IN ('parent', 'grandparent')
          AND fm.is_active = true
      )
    )
  )
);
