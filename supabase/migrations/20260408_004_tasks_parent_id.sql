-- Allow tasks to be grouped into named lists (parent_id = list header task)
-- Used for Shared Shopping Lists: list header has parent_id IS NULL, items have parent_id = header.id
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS tasks_parent_id_idx ON public.tasks (parent_id);
