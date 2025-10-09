-- Create function to set user_id automatically
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to set user_id on insert
CREATE TRIGGER set_tasks_user_id
BEFORE INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_user_id();