-- The invitations migration backfilled "inviteCode" with the organization's own "id"
-- for pre-existing rows. That id is embedded in every member's session JWT, so any
-- employee (not just admins) could read it and hand out a working join link.
-- Replace the leaked placeholder with a real random code; codes already regenerated
-- via the settings page (no longer equal to id) are left untouched.
UPDATE "Organization"
SET "inviteCode" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "inviteCode" = "id";
