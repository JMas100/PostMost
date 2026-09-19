"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** A 4:3 hero with a 96px thumbnail rail beside it, not an equal-size grid -- one photo is what
 *  a buyer actually sees first on every marketplace, so it earns the space. */
export function ListingPhotoGallery({ photos }: { photos: { id: string; url: string }[] }) {
  const [selected, setSelected] = useState(0);
  if (photos.length === 0) {
    return (
      <div>
        <h2 className="mb-3 text-xl font-semibold">Photos</h2>
        <div className="flex aspect-[4/3] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No photos
        </div>
      </div>
    );
  }

  const hero = photos[Math.min(selected, photos.length - 1)];

  return (
    <div>
      <h2 className="mb-3 text-xl font-semibold">Photos</h2>
      <div className="flex gap-3">
        <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero.url} alt="" className="aspect-[4/3] w-full object-cover" />
        </div>
        {photos.length > 1 && (
          <div className="flex w-24 shrink-0 flex-col gap-2">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelected(i)}
                className={cn(
                  "aspect-square overflow-hidden rounded-md border-2 transition-colors",
                  i === selected ? "border-primary" : "border-transparent hover:border-muted-foreground/40"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
