import { DragOverlay as DndDragOverlay } from "@dnd-kit/core";
import React from "react";

interface DragOverlayProps {
  children: React.ReactNode;
}

const DragOverlay: React.FC<DragOverlayProps> = ({ children }) => {
  return (
    <DndDragOverlay
      dropAnimation={{
        duration: 250,
        easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
      }}
    >
      {children}
    </DndDragOverlay>
  );
};

export default DragOverlay;
