import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import SearchBar from "../../src/components/SearchBar";
import { recipeAPI } from "../../src/services/api";
import { Recipe as ImportedRecipe } from "../../src/types/recipe";
import RecipeCard, { favoritesUpdated } from "../components/RecipeCard";

// Local recipe type with required _id
interface Recipe extends Omit<ImportedRecipe, "_id"> {
  _id: string;
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

      // Ensure all recipes have isFavorite property (even if false)
      const processedRecipes = recipesData.map((recipe) => ({
        ...recipe,
        isFavorite: true,
      }));

      setRecipes(processedRecipes);
      setError(null); // Clear any existing errors
    } catch (err) {
      console.error("Failed to fetch favorite recipes:", err);
      // Only set error state if the component is still mounted and visible
      setError("Failed to load your favorites. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavoriteRecipes();
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

    favoritesUpdated.addEventListener(
      "favoritesChanged",
      handleFavoritesChange
    );

    return () => {
      mounted = false;
      favoritesUpdated.removeEventListener(
        "favoritesChanged",
        handleFavoritesChange
      );
    };
  }, []);

  const handleRemoveFromFavorites = async (recipeId: string) => {
    try {
      await recipeAPI.removeFromFavorites(recipeId);
      setRecipes(recipes.filter((recipe) => recipe._id !== recipeId));
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
                  No favorites match your search "{searchQuery}". Try a
                  different search term.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
                <p className="text-gray-600">
                  Browse recipes and click the heart icon to add them to your
                  favorites!
                </p>
                <Link
                  href="/recipes"
                  className="mt-4 inline-block px-4 py-2 bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-200 transition-colors"
                >
                  Browse Recipes
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe._id}
                recipe={recipe}
                onDelete={handleRemoveFromFavorites}
                isEditable={false}
              />
            ))}
          </div>
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
