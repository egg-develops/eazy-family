-- Seed starter community groups
-- These groups are created with a system user ID and are public

-- Insert starter groups (using a fixed UUID for system-created content)
INSERT INTO public.groups (id, name, description, category, created_by, is_public, member_count, created_at)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'Daddy Day',
    'Connect with dads in your area! Share parenting tips, organize playdates, and build a supportive community of fathers.',
    'parenting',
    '00000000-0000-0000-0000-000000000000',
    true,
    1,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Mothers Way',
    'A supportive community for moms! Share experiences, exchange advice, and connect with other mothers in your region.',
    'parenting',
    '00000000-0000-0000-0000-000000000000',
    true,
    1,
    now()
  )
ON CONFLICT DO NOTHING;
