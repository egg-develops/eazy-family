-- Add family_id (scopes shared tasks to a family) and assigned_to (optional per-member assignment)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_family_id_idx ON public.tasks (family_id);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON public.tasks (assigned_to);

-- Drop the broken shared_with-based policies (shared_with stored family_member row IDs but
-- the policy compared them to auth.uid() — they never matched, so shared tasks were invisible
-- to everyone except the creator)
DROP POLICY IF EXISTS "Users can view tasks shared with them" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks shared with them" ON public.tasks;

-- Any family member can view shared tasks that belong to their family
CREATE POLICY "Family members can view shared tasks"
ON public.tasks FOR SELECT
USING (
  type = 'shared'
  AND family_id IS NOT NULL
  AND public.user_belongs_to_family(auth.uid(), family_id)
);

-- Any family member can create shared tasks/items for their own family
CREATE POLICY "Family members can create shared tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  type = 'shared'
  AND family_id IS NOT NULL
  AND public.user_belongs_to_family(auth.uid(), family_id)
);

-- Any family member can update (e.g. mark complete, re-assign) shared tasks in their family
CREATE POLICY "Family members can update shared tasks"
ON public.tasks FOR UPDATE
USING (
  type = 'shared'
  AND family_id IS NOT NULL
  AND public.user_belongs_to_family(auth.uid(), family_id)
)
WITH CHECK (
  type = 'shared'
  AND family_id IS NOT NULL
  AND public.user_belongs_to_family(auth.uid(), family_id)
);

-- Any family member can delete shared tasks in their family
CREATE POLICY "Family members can delete shared tasks"
ON public.tasks FOR DELETE
USING (
  type = 'shared'
  AND family_id IS NOT NULL
  AND public.user_belongs_to_family(auth.uid(), family_id)
);
