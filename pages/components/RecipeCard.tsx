import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  HeartIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../src/context/AuthContext";
import { recipeAPI } from "../../src/services/api";
import TagBadge from "./TagBadge";

// Create a global event bus for favorites updates
export const favoritesUpdated = new EventTarget();

interface RecipeCardProps {
  recipe: {
    _id?: string;
    title?: string;
    description?: string;
    imageUrl?: string;
    cookingTime?: number;
    createdBy?: string;
    isFavorite?: boolean;
    sourceUrl?: string;
    order?: number;
    tags?: Array<{ _id: string; name: string }>;
    user?: { _id: string; username: string };
  };
  from?: string;
  isEditable?: boolean;
  onDelete?: (id: string) => void;
  onFavoriteChange?: (id: string, isFavorite: boolean) => void;
  index?: number; // Added for drag and drop
  isDraggable?: boolean; // Added to control draggability
  onTagClick?: (tagId: string) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  from = "",
  isEditable = false,
  onDelete,
  onFavoriteChange,
  isDraggable = false,
  onTagClick,
}) => {
  const router = useRouter();
  const currentPath = router.pathname;
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  // Safe default for image
  const [imgSrc, setImgSrc] = useState<string>("/images/default-recipe.jpg");
  const [imageError, setImageError] = useState<boolean>(false);
  const [wasDragging, setWasDragging] = useState<boolean>(false);

  // Defensive check for undefined recipe during prerendering
  if (!recipe || !recipe._id) {
    return null;
  }

  // Generate a consistent color based on recipe title
  const getGradientColors = (title: string) => {
    // Create a simple hash from the title
    const hash = title.split("").reduce((hash, char) => {
      return char.charCodeAt(0) + ((hash << 5) - hash);
    }, 0);

    // Use the hash to determine a hue value (0-360)
    const hue = Math.abs(hash % 360);

    // Return a gradient using this hue
    return `linear-gradient(135deg, hsl(${hue}, 70%, 60%) 0%, hsl(${
      (hue + 40) % 360
    }, 70%, 45%) 100%)`;
  };

  const placeholderGradient = getGradientColors(recipe?.title || "Recipe");

  // Setup drag and drop with dnd-kit
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: recipe._id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  // Track the dragging state to prevent navigation when dragging
  useEffect(() => {
    if (isDragging) {
      setWasDragging(true);
    } else {
      // Reset wasDragging after a short delay to allow click events
      const timeout = setTimeout(() => {
        setWasDragging(false);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isDragging]);

  // Initialize favorite status safely
  useEffect(() => {
    if (recipe && typeof recipe.isFavorite !== "undefined") {
      setIsFavorite(Boolean(recipe.isFavorite));
    }
  }, [recipe?.isFavorite]);

  // Initialize image src safely
  useEffect(() => {
    setImageError(false);
    if (recipe?.imageUrl) {
      // Check if the image URL is absolute or relative
      if (
        recipe.imageUrl.startsWith("http") ||
        recipe.imageUrl.startsWith("/api/")
      ) {
        setImgSrc(recipe.imageUrl);
      } else {
        // For relative paths, prepend the API URL
        setImgSrc(`/api/${recipe.imageUrl}`);
      }
    } else {
      // No image, will use placeholder
      setImageError(true);
    }
  }, [recipe?.imageUrl]);

  // Listen for favorite changes
  useEffect(() => {
    const handleFavoritesUpdate = (event: CustomEvent) => {
      if (recipe?._id && event.detail && event.detail.recipeId === recipe._id) {
        setIsFavorite(event.detail.isFavorite);
      }
    };

    window.addEventListener(
      "favoritesUpdated",
      handleFavoritesUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "favoritesUpdated",
        handleFavoritesUpdate as EventListener
      );
    };
  }, [recipe?._id]);

  // Get the from parameter based on the current page
  const fromParam =
    currentPath === "/recipes/my-recipes" ? "/recipes/my-recipes" : "/recipes";

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!recipe?._id || !user) return;

    const newStatus = !isFavorite;

    try {
      // Update UI state immediately for responsive feel
      setIsFavorite(newStatus);

      // Always use the new API for updating favorites
      await recipeAPI.updateUserRecipeOrder(recipe._id, {
        isFavorite: newStatus,
      });

      // Dispatch custom event
      const customEvent = new CustomEvent("favoritesChanged", {
        detail: { recipeId: recipe._id, isFavorite: newStatus },
      });
      favoritesUpdated.dispatchEvent(customEvent);

      // Also dispatch window event for backward compatibility
      const windowEvent = new CustomEvent("favoritesUpdated", {
        detail: { recipeId: recipe._id, isFavorite: newStatus },
      });
      window.dispatchEvent(windowEvent);

      // Notify parent component if callback exists
      if (onFavoriteChange) {
        onFavoriteChange(recipe._id, newStatus);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // Revert UI state on error
      setIsFavorite(!newStatus);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if we were just dragging
    if (wasDragging) return;

    // Navigate to the recipe detail page
    if (recipe?._id) {
      router.push(
        `/recipes/${recipe._id}?from=${encodeURIComponent(fromParam)}`
      );
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const cardContent = (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 flex flex-col h-full">
      {isDraggable ? (
        // If draggable, use a div with a click handler to allow both dragging and navigation
        <div
          className="block flex-grow cursor-pointer"
          onClick={handleCardClick}
        >
          <div className="relative h-48">
            {imageError ? (
              <div
                className="absolute inset-0 flex items-center justify-center p-4"
                style={{ background: placeholderGradient }}
              >
                <h3 className="text-white text-center text-xl font-semibold line-clamp-3">
                  {recipe?.title || "Recipe"}
                </h3>
              </div>
            ) : (
              <Image
                src={imgSrc}
                alt={recipe?.title || "Recipe"}
                fill
                style={{ objectFit: "cover" }}
                onError={handleImageError}
              />
            )}
            {recipe?.cookingTime && (
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                {recipe.cookingTime} min
              </div>
            )}

            {recipe?.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  window.open(recipe.sourceUrl, "_blank");
                }}
                className={`absolute top-2 ${
                  user ? "right-12" : "right-2"
                } p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors z-10`}
                aria-label="View original recipe"
              >
                <ArrowTopRightOnSquareIcon className="h-5 w-5 text-blue-500" />
              </a>
            )}

            {user && recipe && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFavoriteToggle(e);
                }}
                className="absolute top-2 right-2 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 z-10"
                aria-label={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
              >
                <HeartIcon
                  className={`h-5 w-5 ${
                    isFavorite ? "text-red-500 fill-current" : "text-gray-400"
                  }`}
                />
              </button>
            )}
          </div>
          <div className="px-4 pt-4 pb-2 flex-grow flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-1">
                {recipe?.title || "Untitled Recipe"}
              </h3>
              <p className="text-gray-600 text-sm line-clamp-2">
                {recipe?.description || "No description available"}
              </p>
            </div>

            {/* Display tags and edit/delete icons in the same line */}
            <div className="mt-3 flex flex-wrap items-center justify-between">
              <div className="flex flex-wrap flex-1">
                {recipe?.tags && recipe.tags.length > 0 && (
                  <>
                    {recipe.tags.slice(0, 3).map((tag) => (
                      <TagBadge
                        key={tag._id}
                        tag={tag}
                        size="small"
                        onClick={
                          onTagClick ? () => onTagClick(tag._id) : undefined
                        }
                      />
                    ))}
                    {recipe.tags.length > 3 && (
                      <span className="text-xs text-gray-500 ml-1 mt-0.5">
                        +{recipe.tags.length - 3} more
                      </span>
                    )}
                  </>
                )}
              </div>

              {isEditable && recipe && onDelete && (
                <div className="flex space-x-2 ml-2">
                  <Link
                    href={`/recipes/edit/${recipe._id}`}
                    className="text-green-700 hover:text-green-900"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <span className="sr-only">Edit</span>
                    <PencilIcon className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (recipe._id && onDelete) onDelete(recipe._id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <span className="sr-only">Delete</span>
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <Link
          href={
            recipe?._id
              ? `/recipes/${recipe._id}?from=${encodeURIComponent(fromParam)}`
              : "#"
          }
          className="block flex-grow"
        >
          <div className="relative h-48">
            {imageError ? (
              <div
                className="absolute inset-0 flex items-center justify-center p-4"
                style={{ background: placeholderGradient }}
              >
                <h3 className="text-white text-center text-xl font-semibold line-clamp-3">
                  {recipe?.title || "Recipe"}
                </h3>
              </div>
            ) : (
              <Image
                src={imgSrc}
                alt={recipe?.title || "Recipe"}
                fill
                style={{ objectFit: "cover" }}
                onError={handleImageError}
              />
            )}
            {recipe?.cookingTime && (
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                {recipe.cookingTime} min
              </div>
            )}

            {recipe?.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`absolute top-2 ${
                  user ? "right-12" : "right-2"
                } p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors z-10`}
                aria-label="View original recipe"
              >
                <ArrowTopRightOnSquareIcon className="h-5 w-5 text-blue-500" />
              </a>
            )}

            {user && recipe && (
              <button
                onClick={handleFavoriteToggle}
                className="absolute top-2 right-2 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 z-10"
                aria-label={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
              >
                <HeartIcon
                  className={`h-5 w-5 ${
                    isFavorite ? "text-red-500 fill-current" : "text-gray-400"
                  }`}
                />
              </button>
            )}
          </div>
          <div className="p-4 flex-grow flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-1">
                {recipe?.title || "Untitled Recipe"}
              </h3>
              <p className="text-gray-600 text-sm line-clamp-2">
                {recipe?.description || "No description available"}
              </p>
            </div>

            {/* Display tags and edit/delete icons in the same line */}
            <div className="mt-3 flex flex-wrap items-center justify-between">
              <div className="flex flex-wrap flex-1">
                {recipe?.tags && recipe.tags.length > 0 && (
                  <>
                    {recipe.tags.slice(0, 3).map((tag) => (
                      <TagBadge
                        key={tag._id}
                        tag={tag}
                        size="small"
                        onClick={
                          onTagClick ? () => onTagClick(tag._id) : undefined
                        }
                      />
                    ))}
                    {recipe.tags.length > 3 && (
                      <span className="text-xs text-gray-500 ml-1 mt-0.5">
                        +{recipe.tags.length - 3} more
                      </span>
                    )}
                  </>
                )}
              </div>

              {isEditable && recipe && onDelete && (
                <div className="flex space-x-2 ml-2">
                  <Link
                    href={`/recipes/edit/${recipe._id}`}
                    className="text-green-700 hover:text-green-900"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="sr-only">Edit</span>
                    <PencilIcon className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (recipe._id && onDelete) onDelete(recipe._id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <span className="sr-only">Delete</span>
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </Link>
      )}
    </div>
  );

  return isDraggable ? (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className="touch-manipulation cursor-pointer"
    >
      {cardContent}
    </div>
  ) : (
    cardContent
  );
};

export default RecipeCard;
