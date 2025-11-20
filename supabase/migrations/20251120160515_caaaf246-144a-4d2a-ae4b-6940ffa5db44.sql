-- Add RLS policy to allow users to view tasks shared with them
CREATE POLICY "Users can view tasks shared with them"
ON public.tasks
FOR SELECT
USING (auth.uid()::text = ANY(shared_with));

-- Add RLS policy to allow users to update tasks shared with them (mark as complete)
CREATE POLICY "Users can update tasks shared with them"
ON public.tasks
FOR UPDATE
USING (auth.uid()::text = ANY(shared_with))
WITH CHECK (auth.uid()::text = ANY(shared_with));