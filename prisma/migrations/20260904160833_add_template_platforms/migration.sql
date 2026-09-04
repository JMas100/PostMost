-- A template can now remember which marketplaces it should pre-select when used. Nullable, no
-- default meaning: null means "no preference," not "no platforms" -- the composer falls back to
-- its own default (every connected platform) when this is unset.
ALTER TABLE "Template" ADD COLUMN "platforms" TEXT;
