UPDATE "User" AS "user"
SET "firstCrosspostAt" = "firstPost"."postedAt"
FROM (
  SELECT
    "listing"."userId",
    MIN(COALESCE("platformListing"."postedAt", "platformListing"."createdAt")) AS "postedAt"
  FROM "PlatformListing" AS "platformListing"
  INNER JOIN "Listing" AS "listing"
    ON "listing"."id" = "platformListing"."listingId"
  WHERE "platformListing"."status" IN ('POSTED', 'SOLD', 'DELISTED')
  GROUP BY "listing"."userId"
) AS "firstPost"
WHERE "user"."id" = "firstPost"."userId"
  AND "user"."firstCrosspostAt" IS NULL;
