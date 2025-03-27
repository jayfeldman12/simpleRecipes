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
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import SearchBar, { SearchBarHandle } from "../../src/components/SearchBar";
import { useAuth } from "../../src/context/AuthContext";
import { recipeAPI } from "../../src/services/api";
import { Recipe as ImportedRecipe, Tag } from "../../src/types/recipe";
import RecipeCard, { favoritesUpdated } from "../components/RecipeCard";
import TagFilter from "../components/TagFilter";

// Local recipe type with required _id
interface Recipe extends Omit<ImportedRecipe, "_id"> {
  _id: string;
  isFavorite?: boolean;
  order?: number;
}

export default function RecipeList() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { user } = useAuth();
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

  const fetchRecipes = async () => {
    try {
      // Use the API service which handles auth headers automatically
      const data = await recipeAPI.getRecipes();

      // Ensure we have an array of recipes and check for favorite status
      let recipesArray = [];
      if (Array.isArray(data)) {
        recipesArray = data;
      } else if (data && Array.isArray(data.recipes)) {
        recipesArray = data.recipes;
      } else {
        console.error("Unexpected data format:", data);
        setRecipes([]);
        setError("Received invalid data format from server");
        return;
      }

      // Explicitly convert isFavorite to boolean and ensure order is a number
      const processed = recipesArray.map((recipe, index) => ({
        ...recipe,
        isFavorite: Boolean(recipe.isFavorite),
        // Ensure order is a number, use index as fallback
        order: typeof recipe.order === "number" ? recipe.order : index,
      })) as Recipe[];

      // Sort recipes by order only
      const sortedRecipes = processed.sort((a: Recipe, b: Recipe) => {
        return (
          (typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER) -
          (typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER)
        );
      });

      setRecipes(sortedRecipes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error(err);
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
    fetchRecipes();
    fetchTags();
  }, []);

  // Listen for favorite changes and update recipes accordingly
  useEffect(() => {
    // Handle favorites changed from RecipeCard component
    const handleFavoritesChange = (e: Event) => {
      if (e instanceof CustomEvent && e.detail) {
        const { recipeId, isFavorite } = e.detail;

        // Update the isFavorite status for this recipe in our state
        setRecipes((prevRecipes) => {
          const updatedRecipes = prevRecipes.map((recipe) =>
            recipe._id === recipeId ? { ...recipe, isFavorite } : recipe
          );

          // Re-sort the recipes by order only
          return updatedRecipes.sort((a: Recipe, b: Recipe) => {
            return (
              (typeof a.order === "number"
                ? a.order
                : Number.MAX_SAFE_INTEGER) -
              (typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER)
            );
          });
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
      favoritesUpdated.removeEventListener(
        "favoritesChanged",
        handleFavoritesChange
      );
      window.removeEventListener("favoritesUpdated", handleFavoritesChange);
    };
  }, []);

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

  // Get IDs for sortable context
  const recipeIds = useMemo(() => {
    return filteredRecipes.map((recipe) => recipe._id);
  }, [filteredRecipes]);

  // Get active filter count for UI
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedTags.length > 0) count++;
    return count;
  }, [searchQuery, selectedTags]);

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

  // Handle drag end event
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !user) return;

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
        isFavorite: recipe.isFavorite,
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

  // Handle delete action for user's own recipes
  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm("Are you sure you want to delete this recipe?")) {
      return;
    }

    try {
      await recipeAPI.deleteRecipe(recipeId);
      // Update local state to remove the recipe
      setRecipes(recipes.filter((recipe) => recipe._id !== recipeId));
    } catch (err) {
      console.error("Failed to delete recipe:", err);
      alert("Failed to delete recipe. Please try again.");
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
        <title>All Recipes | Simple Recipes</title>
        <meta
          name="description"
          content="Browse our collection of delicious recipes"
        />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">All Recipes</h1>
            <p className="text-gray-600 mt-1">
              Browse and discover delicious recipes
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <SearchBar
              onSearch={setSearchQuery}
              className="w-full sm:w-64 lg:w-80"
              ref={searchBarRef}
            />

            {user && (
              <Link
                href="/recipes/create"
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
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Create Recipe
              </Link>
            )}
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

        {filteredRecipes.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            {activeFilterCount > 0 ? (
              <>
                <h2 className="text-xl font-semibold mb-2">No matches found</h2>
                <p className="text-gray-600">
                  No recipes match your current filters. Try different search
                  terms or tags.
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
                <h2 className="text-xl font-semibold mb-2">No recipes found</h2>
                <p className="text-gray-600">
                  {user
                    ? "Create your first recipe by clicking the 'Create Recipe' button above!"
                    : "Sign in to create your own recipes!"}
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {activeFilterCount > 0 && (
              <div className="mb-4 flex items-center">
                <span className="text-sm text-gray-600 mr-2">
                  Showing {filteredRecipes.length} of {recipes.length} recipes
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
                      onDelete={
                        user && recipe.user && user._id === recipe.user._id
                          ? handleDeleteRecipe
                          : undefined
                      }
                      isEditable={
                        !!(user && recipe.user && user._id === recipe.user._id)
                      }
                      isDraggable={!!user}
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
}
