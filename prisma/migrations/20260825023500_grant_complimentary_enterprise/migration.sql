UPDATE "User"
SET
  "planOverride" = 'enterprise',
  "planOverrideExpiresAt" = NULL
WHERE md5(lower("email")) = 'edc7087188307b6c070731881ea44c3c';
