"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BgRemovalTier } from "@/lib/plans";

function SortablePhoto({
  url,
  isCover,
  onRemove,
  onEnhance,
  enhancing,
  disabled,
  studioAvailable,
}: {
  url: string;
  isCover: boolean;
  onRemove: () => void;
  onEnhance: (tier: BgRemovalTier) => void;
  enhancing: boolean;
  disabled: boolean;
  studioAvailable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative aspect-square touch-none overflow-hidden rounded-md",
        isCover && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-cover" />
      {isCover && (
        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
          COVER
        </span>
      )}
      <div className="absolute inset-x-1 top-1 flex justify-between">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEnhance("standard");
            }}
            disabled={disabled}
            className={cn(
              "rounded-full bg-background/90 p-1 text-foreground shadow-sm disabled:opacity-50",
              "opacity-0 transition-opacity group-hover:opacity-100"
            )}
            title="Remove background"
          >
            <Wand2 className={cn("h-3 w-3", enhancing && "animate-pulse")} />
          </button>
          {studioAvailable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEnhance("studio");
              }}
              disabled={disabled}
              className={cn(
                "rounded-full bg-background/90 p-1 text-foreground shadow-sm disabled:opacity-50",
                "opacity-0 transition-opacity group-hover:opacity-100"
              )}
              title="Remove background — studio quality"
            >
              <Sparkles className={cn("h-3 w-3", enhancing && "animate-pulse")} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm"
          title="Remove photo"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function PhotoSortableGrid({
  photos,
  onReorder,
  onRemove,
  onEnhance,
  enhancingUrls,
  disabled,
  studioAvailable,
  onAddMore,
  maxPhotos = 24,
}: {
  photos: string[];
  onReorder: (next: string[]) => void;
  onRemove: (url: string) => void;
  onEnhance: (url: string, tier: BgRemovalTier) => void;
  enhancingUrls: string[];
  disabled: boolean;
  studioAvailable: boolean;
  /** Renders a dashed "add more" tile after the grid, outside the sortable context. */
  onAddMore?: () => void;
  maxPhotos?: number;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.indexOf(String(active.id));
    const newIndex = photos.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(photos, oldIndex, newIndex));
  }

  if (photos.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={photos} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {photos.map((url, index) => (
            <SortablePhoto
              key={url}
              url={url}
              isCover={index === 0}
              onRemove={() => onRemove(url)}
              onEnhance={(tier) => onEnhance(url, tier)}
              enhancing={enhancingUrls.includes(url)}
              disabled={disabled}
              studioAvailable={studioAvailable}
            />
          ))}
          {onAddMore && photos.length < maxPhotos && (
            <button
              type="button"
              onClick={onAddMore}
              disabled={disabled}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border border-dashed text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <Plus className="h-5 w-5" />
              <span className="text-xs">Add</span>
            </button>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}
