import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import SearchBar from "../../src/components/SearchBar";
import { useAuth } from "../../src/context/AuthContext";
import { recipeAPI } from "../../src/services/api";
import RecipeCard, { favoritesUpdated } from "../components/RecipeCard";

interface Recipe {
  _id: string;
  title: string;
  imageUrl: string;
  description: string;
  cookingTime?: number;
  user: {
    _id: string;
    username: string;
  };
  createdAt: string;
  isFavorite?: boolean;
}

const MyRecipesPage = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchUserRecipes = async () => {
      try {
        setLoading(true);
        const data = await recipeAPI.getUserRecipes();

        // Handle array or object response
        let recipesData: Recipe[] = [];
        if (Array.isArray(data)) {
          recipesData = data;
        } else if (data && Array.isArray(data.recipes)) {
          recipesData = data.recipes;
        }

        // Ensure all recipes have isFavorite property
        const processedRecipes = recipesData.map((recipe) => ({
          ...recipe,
          isFavorite: Boolean(recipe.isFavorite),
        }));

        // Sort recipes - favorites first
        const sortedRecipes = processedRecipes.sort((a: Recipe, b: Recipe) => {
          // If one is favorite and other is not, favorite comes first
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          // Otherwise maintain existing order
          return 0;
        });

        setRecipes(sortedRecipes);
      } catch (err) {
        console.error("Failed to fetch recipes:", err);
        setError("Failed to load your recipes. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserRecipes();
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

  // Listen for favorites changes
  useEffect(() => {
    const handleFavoritesChange = (e: Event) => {
      if (e instanceof CustomEvent && e.detail) {
        const { recipeId, isFavorite } = e.detail;

        // Update the isFavorite status for this recipe in our state
        setRecipes((prevRecipes) => {
          const updatedRecipes = prevRecipes.map((recipe) =>
            recipe._id === recipeId ? { ...recipe, isFavorite } : recipe
          );

          // Re-sort the recipes to keep favorites at the top
          return updatedRecipes.sort((a: Recipe, b: Recipe) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return 0;
          });
        });
      }
    };

    favoritesUpdated.addEventListener(
      "favoritesChanged",
      handleFavoritesChange
    );

    return () => {
      favoritesUpdated.removeEventListener(
        "favoritesChanged",
        handleFavoritesChange
      );
    };
  }, []);

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm("Are you sure you want to delete this recipe?")) {
      return;
    }

    try {
      await recipeAPI.deleteRecipe(recipeId);
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
        <title>My Recipes | Simple Recipes</title>
        <meta
          name="description"
          content="View and manage your personal recipes"
        />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Recipes</h1>
            <p className="text-gray-600 mt-1">
              Manage your personal recipe collection
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <SearchBar
              onSearch={setSearchQuery}
              className="w-full sm:w-64 lg:w-80"
            />

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
                <h2 className="text-xl font-semibold mb-2">No recipes yet</h2>
                <p className="text-gray-600">
                  Create your first recipe by clicking the 'Create Recipe'
                  button above!
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe._id}
                recipe={recipe}
                onDelete={handleDeleteRecipe}
                isEditable={true}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const WrappedMyRecipesPage = () => (
  <ProtectedRoute>
    <MyRecipesPage />
  </ProtectedRoute>
);

export default WrappedMyRecipesPage;
