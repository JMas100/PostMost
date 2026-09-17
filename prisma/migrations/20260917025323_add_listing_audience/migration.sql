-- Who the item is for ("Women"/"Men"/"Kids"/"Unisex"), so audience-taxonomy platforms
-- (Poshmark: Women/Men/Kids/Home/Pets/Electronics) don't have to guess it from the title.
ALTER TABLE "Listing" ADD COLUMN "audience" TEXT;
