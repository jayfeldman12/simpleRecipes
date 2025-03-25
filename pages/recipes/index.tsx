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
import { useEffect, useMemo, useState } from "react";
import SearchBar from "../../src/components/SearchBar";
import { useAuth } from "../../src/context/AuthContext";
import { recipeAPI } from "../../src/services/api";
import { Recipe as ImportedRecipe } from "../../src/types/recipe";
import RecipeCard, { favoritesUpdated } from "../components/RecipeCard";

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
  const { user } = useAuth();

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

      console.log(
        "Recipes from API:",
        recipesArray.map((r) => ({
          id: r._id,
          title: r.title,
          order: r.order,
          isFavorite: r.isFavorite,
        }))
      );

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

      console.log(
        "Sorted recipes client-side:",
        sortedRecipes.map((r) => ({
          id: r._id,
          title: r.title,
          order: r.order,
          isFavorite: r.isFavorite,
        }))
      );

      setRecipes(sortedRecipes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  // Listen for favorite changes and update recipes accordingly
  useEffect(() => {
    // Handle favorites changed from RecipeCard component
    const handleFavoritesChange = (e: Event) => {
      if (e instanceof CustomEvent && e.detail) {
        const { recipeId, isFavorite } = e.detail;
        console.log(
          `Received favorites update event for ${recipeId}: ${isFavorite}`
        );

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

  // Filter recipes based on search query
  const filteredRecipes = useMemo(() => {
    if (!searchQuery) return recipes;

    const query = searchQuery.toLowerCase();
    return recipes.filter(
      (recipe) =>
        recipe.title.toLowerCase().includes(query) ||
        recipe.description.toLowerCase().includes(query)
    );
  }, [recipes, searchQuery]);

  // Get IDs for sortable context
  const recipeIds = useMemo(() => {
    return filteredRecipes.map((recipe) => recipe._id);
  }, [filteredRecipes]);

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
      // Revert to original order on error
      setRecipes(recipes);
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
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

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {filteredRecipes.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            {searchQuery ? (
              <>
                <h2 className="text-xl font-semibold mb-2">No matches found</h2>
                <p className="text-gray-600">
                  No recipes match your search "{searchQuery}". Try a different
                  search term.
                </p>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={recipeIds} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe._id}
                    recipe={recipe}
                    onDelete={undefined}
                    isEditable={false}
                    isDraggable={!!user}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>
    </div>
  );
}
