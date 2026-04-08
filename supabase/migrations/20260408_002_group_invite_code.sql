-- Add short invite code to groups for shareable URLs
-- Replaces long UUIDs with 8-char alphanumeric codes

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS invite_code varchar(8);

-- Generate unique codes for existing groups
UPDATE public.groups
SET invite_code = substring(md5(id::text || random()::text) FROM 1 FOR 8)
WHERE invite_code IS NULL;

-- Make not-null and unique going forward
ALTER TABLE public.groups
  ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS groups_invite_code_idx ON public.groups (invite_code);

-- Function to generate a new unique invite code
CREATE OR REPLACE FUNCTION generate_group_invite_code()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  new_code varchar(8);
  exists_already boolean;
BEGIN
  LOOP
    new_code := substring(md5(NEW.id::text || random()::text) FROM 1 FOR 8);
    SELECT EXISTS (SELECT 1 FROM public.groups WHERE invite_code = new_code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  NEW.invite_code := new_code;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_group_invite_code
BEFORE INSERT ON public.groups
FOR EACH ROW
WHEN (NEW.invite_code IS NULL)
EXECUTE FUNCTION generate_group_invite_code();
