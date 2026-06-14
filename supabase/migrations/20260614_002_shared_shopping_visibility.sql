-- Shared shopping was never actually shared between members.
--
-- `tasks` only had SELECT policies for "your own tasks" (auth.uid() = user_id)
-- and "shared tasks" (type = 'shared'). Family shopping items are type =
-- 'shopping' with a family_id, so NEITHER policy matched for anyone but the
-- creator — every member saw only the items they personally added. Verified
-- 2026-06-14 with a second family member who saw an empty shared shopping list.
--
-- Add family-scoped SELECT/UPDATE/DELETE for type = 'shopping' so all members
-- see, tick, edit, and remove the shared shopping list. Personal shopping
-- (type = 'shopping_personal') stays private via the existing own-task policies.

CREATE POLICY "Family members can view shared shopping"
ON public.tasks FOR SELECT
USING (
  type = 'shopping' AND family_id IS NOT NULL
  AND public.user_belongs_to_family(auth.uid(), family_id)
);

CREATE POLICY "Family members can update shared shopping"
ON public.tasks FOR UPDATE
USING (
  type = 'shopping' AND family_id IS NOT NULL
  AND public.user_belongs_to_family(auth.uid(), family_id)
);

CREATE POLICY "Family members can delete shared shopping"
ON public.tasks FOR DELETE
USING (
  type = 'shopping' AND family_id IS NOT NULL
  AND public.user_belongs_to_family(auth.uid(), family_id)
);
