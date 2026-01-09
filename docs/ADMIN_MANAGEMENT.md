# Admin Role Management

## Security Overview
- All new signups are automatically created as **students**
- Admin role can ONLY be assigned manually in the database
- Frontend signup form no longer allows admin selection

## Promoting a User to Admin

### Method 1: Using Supabase Dashboard
1. Go to Supabase Dashboard → Table Editor
2. Navigate to `user_roles` table
3. Find the user by `user_id` (get from `auth.users` table)
4. Update the `role` column from `'student'` to `'admin'`

### Method 2: Using SQL Query
```sql
-- Replace 'user-uuid-here' with the actual user ID
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = 'user-uuid-here';
```

### Method 3: Finding User ID by Email
```sql
-- First, find the user ID by email
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Then promote to admin using the ID
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = 'the-user-id-from-above';
```

## Verification
After promoting a user, verify the change:
```sql
SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'user@example.com';
```

## Security Notes
- Never expose admin promotion functionality in the frontend
- Always verify user identity before promoting to admin
- Consider implementing an approval workflow for admin requests
- Regularly audit admin users in your system

## Revoking Admin Access
To demote an admin back to student:
```sql
UPDATE public.user_roles 
SET role = 'student' 
WHERE user_id = 'user-uuid-here';
```