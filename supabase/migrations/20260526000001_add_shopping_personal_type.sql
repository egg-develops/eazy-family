-- Allow shopping_personal as a valid task type (personal shopping list items)
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_type_check;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_type_check
  CHECK (type IN ('task', 'shopping', 'shared', 'shopping_personal'));
