import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import SearchBar, { SearchBarHandle } from "../../src/components/SearchBar";
import { recipeAPI } from "../../src/services/api";
import { Recipe as ImportedRecipe, Tag } from "../../src/types/recipe";
import RecipeCard, { favoritesUpdated } from "../components/RecipeCard";
import TagFilter from "../components/TagFilter";

// Local recipe type with required _id
interface Recipe extends Omit<ImportedRecipe, "_id"> {
  _id: string;
  order?: number;
}

// Response type for getRecipes endpoint
interface RecipesResponse {
  recipes: Recipe[];
  totalPages?: number;
  currentPage?: number;
}

const FavoritesPage = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const searchBarRef = useRef<SearchBarHandle>(null);

  // Set up dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchFavoriteRecipes = async () => {
    try {
      setLoading(true);
      const data = await recipeAPI.getFavoriteRecipes();

      // Handle array or object response
      let recipesData: Recipe[] = [];
      if (Array.isArray(data)) {
        recipesData = data as Recipe[];
      } else {
        // Data is an object, but we expect an array directly
        // This is a fallback in case the API response format changes
        recipesData = [];
      }

      // Ensure all recipes have isFavorite property and order property
      const processedRecipes = recipesData.map((recipe, index) => ({
        ...recipe,
        isFavorite: true,
        order: typeof recipe.order === "number" ? recipe.order : index,
      }));

      // Sort recipes by order
      const sortedRecipes = processedRecipes.sort((a, b) => {
        return (
          (typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER) -
          (typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER)
        );
      });

      setRecipes(sortedRecipes);
      setError(null); // Clear any existing errors
    } catch (err) {
      console.error("Failed to fetch favorite recipes:", err);
      // Only set error state if the component is still mounted and visible
      setError("Failed to load your favorites. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const tags = await recipeAPI.getAllTags();
      setAllTags(tags);
    } catch (err) {
      console.error("Error fetching tags:", err);
    }
  };

  useEffect(() => {
    fetchFavoriteRecipes();
    fetchTags();
  }, []);

  // Clear all filters function
  const clearAllFilters = () => {
    // Use the imperative handle to clear search
    if (searchBarRef.current) {
      searchBarRef.current.clear();
    } else {
      setSearchQuery("");
    }

    setSelectedTags([]);
  };

  // Handle tag selection
  const handleTagSelect = (tagId: string) => {
    setSelectedTags((prevTags) => {
      if (prevTags.includes(tagId)) {
        return prevTags.filter((id) => id !== tagId);
      } else {
        return [...prevTags, tagId];
      }
    });
  };

  // Filter recipes based on search query and selected tags
  const filteredRecipes = useMemo(() => {
    let filtered = recipes;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (recipe) =>
          recipe.title.toLowerCase().includes(query) ||
          recipe.description.toLowerCase().includes(query)
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(
        (recipe) =>
          recipe.tags &&
          recipe.tags.some((tag) => selectedTags.includes(tag._id))
      );
    }

    return filtered;
  }, [recipes, searchQuery, selectedTags]);

  // Calculate tag counts from all recipes
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    recipes.forEach((recipe) => {
      if (recipe.tags && recipe.tags.length > 0) {
        recipe.tags.forEach((tag) => {
          counts[tag._id] = (counts[tag._id] || 0) + 1;
        });
      }
    });

    return counts;
  }, [recipes]);

  // Get active filter count for UI
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedTags.length > 0) count++;
    return count;
  }, [searchQuery, selectedTags]);

  // Get IDs for sortable context
  const recipeIds = useMemo(() => {
    return filteredRecipes.map((recipe) => recipe._id);
  }, [filteredRecipes]);

  // Handle drag end event
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    // Make sure we have valid IDs and they're different
    if (active.id === over.id) return;

    // Find the indices of the dragged items
    const oldIndex = filteredRecipes.findIndex(
      (recipe) => recipe._id === active.id
    );
    const newIndex = filteredRecipes.findIndex(
      (recipe) => recipe._id === over.id
    );

    if (oldIndex === -1 || newIndex === -1) return;

    // Create a new array with the element moved to the new position
    const newRecipes = arrayMove(recipes, oldIndex, newIndex);

    // Update the order property for all affected recipes starting from the lowest affected index
    const startIdx = Math.min(oldIndex, newIndex);
    const endIdx = Math.max(oldIndex, newIndex);

    // Create a batch update for all recipes that need their order changed
    const recipeUpdates = newRecipes
      .map((recipe, idx) => ({
        recipeId: recipe._id,
        order: idx,
        isFavorite: true,
      }))
      .filter((_, idx) => idx >= startIdx && idx <= endIdx);

    // Update the state immediately for smooth UI
    setRecipes(
      newRecipes.map((recipe, index) => ({
        ...recipe,
        order: index,
      }))
    );

    try {
      // Batch update the orders in the database
      await recipeAPI.batchUpdateRecipeOrders(recipeUpdates);
    } catch (error) {
      console.error("Error updating recipe orders:", error);
      // Only revert the order if there's a valid error (network errors will be handled silently)
      if (error instanceof Error && error.message !== "NetworkError") {
        setRecipes(recipes);
      }
    }
  };

  // Listen for favorites changes
  useEffect(() => {
    let mounted = true;

    const handleFavoritesChange = (e: Event) => {
      if (!mounted) return;

      if (e instanceof CustomEvent && e.detail) {
        const { recipeId, isFavorite } = e.detail;

        // If a recipe was unfavorited, just remove it from the local state
        if (!isFavorite) {
          setRecipes((prev) =>
            prev.filter((recipe) => recipe._id !== recipeId)
          );
          return;
        }

        // Only fetch if we need fresh data
        fetchFavoriteRecipes().catch((err) => {
          console.error("Error refreshing favorites:", err);
        });
      }
    };

    // Add event listeners for both the custom event target and window
    favoritesUpdated.addEventListener(
      "favoritesChanged",
      handleFavoritesChange
    );
    window.addEventListener("favoritesUpdated", handleFavoritesChange);

    return () => {
      mounted = false;
      favoritesUpdated.removeEventListener(
        "favoritesChanged",
        handleFavoritesChange
      );
      window.removeEventListener("favoritesUpdated", handleFavoritesChange);
    };
  }, []);

  const handleRemoveFromFavorites = async (recipeId: string) => {
    try {
      // Use updateUserRecipeOrder instead of the older removeFromFavorites
      await recipeAPI.updateUserRecipeOrder(recipeId, { isFavorite: false });

      // Remove from local state
      setRecipes(recipes.filter((recipe) => recipe._id !== recipeId));

      // Dispatch events to ensure other components stay in sync
      const event = new CustomEvent("favoritesUpdated", {
        detail: { recipeId, isFavorite: false },
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error("Failed to remove from favorites:", err);
      alert("Failed to remove from favorites. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Head>
        <title>My Favorites | Simple Recipes</title>
        <meta
          name="description"
          content="View and manage your favorite recipes"
        />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Favorites</h1>
            <p className="text-gray-600 mt-1">
              Your collection of favorite recipes
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <SearchBar
              onSearch={setSearchQuery}
              className="w-full sm:w-64 lg:w-80"
              ref={searchBarRef}
            />

            <Link
              href="/recipes"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z"
                  clipRule="evenodd"
                />
              </svg>
              Browse All Recipes
            </Link>
          </div>
        </div>

        {/* Tag filter */}
        <TagFilter
          tags={allTags}
          selectedTags={selectedTags}
          onTagSelect={handleTagSelect}
          className="mb-6"
          recipeCounts={tagCounts}
        />

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            {activeFilterCount > 0 ? (
              <>
                <h2 className="text-xl font-semibold mb-2">No matches found</h2>
                <p className="text-gray-600">
                  No favorite recipes match your current filters. Try different
                  search terms or tags.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
                <p className="text-gray-600">
                  You haven't added any recipes to your favorites yet.
                </p>
                <Link
                  href="/recipes"
                  className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Browse Recipes
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            {activeFilterCount > 0 && (
              <div className="mb-4 flex items-center">
                <span className="text-sm text-gray-600 mr-2">
                  Showing {filteredRecipes.length} of {recipes.length} favorite
                  recipes
                </span>
                <button
                  onClick={clearAllFilters}
                  className="text-xs px-2 py-1 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={recipeIds} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
                  {filteredRecipes.map((recipe) => (
                    <RecipeCard
                      key={recipe._id}
                      recipe={recipe}
                      onDelete={(id) => handleRemoveFromFavorites(id)}
                      isEditable={false}
                      isDraggable={true}
                      onTagClick={(tagId) => handleTagSelect(tagId)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </main>
    </div>
  );
};

// Wrap the page with ProtectedRoute to require authentication
const WrappedFavoritesPage = () => (
  <ProtectedRoute>
    <FavoritesPage />
  </ProtectedRoute>
);

export default WrappedFavoritesPage;
