import { useRef } from "react";
import { DropTargetMonitor, useDrag, useDrop } from "react-dnd";
import RecipeCard from "../../pages/components/RecipeCard";
import { Recipe } from "../types/recipe";

// Item type for drag and drop
const ITEM_TYPE = "RECIPE_CARD";

interface DragItem {
  id: string;
  index: number;
  type: string;
}

interface DraggableRecipeCardProps {
  recipe: Recipe;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  onDragEnd: () => void;
  onDragStart?: () => void;
  isEditable?: boolean;
  onDelete?: (id: string) => void;
  onFavoriteChange?: (id: string, isFavorite: boolean) => void;
}

const DraggableRecipeCard: React.FC<DraggableRecipeCardProps> = ({
  recipe,
  index,
  moveCard,
  onDragEnd,
  onDragStart,
  isEditable,
  onDelete,
  onFavoriteChange,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // Set up drag source
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: () => {
      // Call onDragStart when dragging begins
      if (onDragStart) {
        onDragStart();
      }
      return { id: recipe._id, index, type: ITEM_TYPE };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: () => {
      onDragEnd();
    },
  });

  // Set up drop target
  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: ITEM_TYPE,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
    hover: (item: DragItem, monitor: DropTargetMonitor) => {
      if (!ref.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveCard(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  // Initialize drag and drop refs
  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`transition-all duration-150 ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
      style={{
        cursor: "move",
        position: "relative",
        zIndex: isDragging ? 1000 : 1,
      }}
    >
      <RecipeCard
        recipe={recipe}
        isEditable={isEditable}
        onDelete={onDelete}
        onFavoriteChange={onFavoriteChange}
      />
    </div>
  );
};

export default DraggableRecipeCard;
