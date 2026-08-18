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
import { Trash2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

function SortablePhoto({
  url,
  onRemove,
  onEnhance,
  enhancing,
  disabled,
}: {
  url: string;
  onRemove: () => void;
  onEnhance: () => void;
  enhancing: boolean;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="group relative aspect-square touch-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full rounded-md object-cover" />
      <div className="absolute inset-x-1 top-1 flex justify-between">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEnhance();
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
  enhancingUrl,
  disabled,
}: {
  photos: string[];
  onReorder: (next: string[]) => void;
  onRemove: (url: string) => void;
  onEnhance: (url: string) => void;
  enhancingUrl: string | null;
  disabled: boolean;
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
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((url) => (
            <SortablePhoto
              key={url}
              url={url}
              onRemove={() => onRemove(url)}
              onEnhance={() => onEnhance(url)}
              enhancing={enhancingUrl === url}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
