import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bars3Icon } from "@heroicons/react/24/outline";
import React from "react";

interface SortableRowProps {
  id: string;
  /** Accessible name for the handle, e.g. "Reorder ingredient 2" */
  label: string;
  /** Smaller handle for nested rows like sub-ingredients */
  compact?: boolean;
  children: React.ReactNode;
}

/**
 * Wraps a form row in a drag-to-reorder container with a dedicated grab handle.
 * Only the handle activates a drag, so the row's inputs stay editable, and it
 * sets touch-action: none so dragging works on touch devices without the page
 * scrolling instead.
 */
const SortableRow: React.FC<SortableRowProps> = ({
  id,
  label,
  compact = false,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    position: "relative",
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-1 sm:gap-2"
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={label}
        title={label}
        className={`flex-shrink-0 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-grab active:cursor-grabbing touch-none ${
          compact ? "h-8 w-6" : "h-10 w-8"
        }`}
      >
        <Bars3Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

export default SortableRow;
