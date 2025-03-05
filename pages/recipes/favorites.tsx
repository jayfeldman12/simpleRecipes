import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import { recipeAPI } from "../../src/services/api";
import RecipeCard, { favoritesUpdated } from "../components/RecipeCard";

interface Recipe {
  _id: string;
  title: string;
  imageUrl: string;
  description: string;
  createdAt: string;
  user: {
    _id: string;
    username: string;
  };
  isFavorite?: boolean;
}

const FavoritesPage = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFavoriteRecipes = async () => {
    try {
      setLoading(true);
      const data = await recipeAPI.getFavoriteRecipes();

      // Handle array or object response
      let recipesData: Recipe[] = [];
      if (Array.isArray(data)) {
        recipesData = data;
      } else if (data && Array.isArray(data.recipes)) {
        recipesData = data.recipes;
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

  const handleRemoveFavorite = async (recipeId: string) => {
    try {
      await recipeAPI.removeFromFavorites(recipeId);
      setRecipes(recipes.filter((recipe) => recipe._id !== recipeId));
    } catch (err) {
      console.error("Failed to remove from favorites:", err);
      alert("Failed to remove from favorites. Please try again.");
    }
  };

  return (
    <>
      <Head>
        <title>My Favorites | Simple Recipes</title>
      </Head>
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          My Favorite Recipes
        </h1>

        {loading ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 my-12">{error}</div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <h2 className="text-2xl font-medium text-gray-700 mb-4">
              You don't have any favorite recipes yet
            </h2>
            <p className="text-gray-500 mb-6">
              Browse recipes and click the heart icon to add them to your
              favorites!
            </p>
            <Link
              href="/recipes"
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Browse Recipes
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe._id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// Wrap the page with ProtectedRoute to require authentication
const WrappedFavoritesPage = () => (
  <ProtectedRoute>
    <FavoritesPage />
  </ProtectedRoute>
);

export default WrappedFavoritesPage;
