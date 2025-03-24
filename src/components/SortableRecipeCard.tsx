import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React from "react";
import RecipeCard from "../../pages/components/RecipeCard";
import { Recipe } from "../types/recipe";

interface SortableRecipeCardProps {
  recipe: Recipe;
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
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
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
