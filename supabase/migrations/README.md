# Database Migrations

## Note on Row Level Security (RLS) Policies
The RLS policies on tables like `applications`, `resumes`, and `reminders` (added in earlier migrations) are largely defense-in-depth and serve as redundant dead code in production. 

This is because migration `20260530000003_revoke_public_privileges` explicitly revokes all table grants from the `authenticated` and `anon` roles. Direct table access via the PostgREST API is blocked at the grant level, meaning clients cannot access these tables directly regardless of RLS. The backend service uses the `service_role` key, which bypasses RLS entirely.

The policies remain as an architectural safeguard, but future engineers should be aware they are not the primary access control mechanism.
