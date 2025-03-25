import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React from "react";
import RecipeCard from "../../pages/components/RecipeCard";

interface SimplifiedRecipe {
  _id: string;
  title: string;
  description: string;
  imageUrl?: string;
  cookingTime?: number;
  isFavorite?: boolean;
}

interface SortableRecipeCardProps {
  recipe: SimplifiedRecipe;
  id: string;
  isEditable?: boolean;
  onDelete?: (id: string) => void;
  onFavoriteChange?: (id: string, isFavorite: boolean) => void;
}

const SortableRecipeCard: React.FC<SortableRecipeCardProps> = ({
  recipe,
  id,
  isEditable,
  onDelete,
  onFavoriteChange,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 999 : 1,
    touchAction: "none", // Prevents scrolling while dragging on touch devices
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative group cursor-grab ${
        isDragging ? "cursor-grabbing" : ""
      }`}
    >
      <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-gray-200/50 to-transparent rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
      <RecipeCard
        recipe={recipe}
        isEditable={isEditable}
        onDelete={onDelete}
        onFavoriteChange={onFavoriteChange}
      />
    </div>
  );
};

export default SortableRecipeCard;
