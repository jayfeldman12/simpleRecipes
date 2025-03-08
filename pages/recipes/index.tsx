import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAuth } from "../../src/context/AuthContext";
import { recipeAPI } from "../../src/services/api";
import RecipeCard, { favoritesUpdated } from "../components/RecipeCard";

// Define a type for Recipe
interface Recipe {
  _id: string;
  title: string;
  description: string;
  cookingTime?: number;
  imageUrl: string;
  user: {
    _id: string;
    username: string;
  };
  isFavorite?: boolean;
}

export default function RecipeList() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

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

      // Explicitly convert isFavorite to boolean
      const processed = recipesArray.map((recipe: Recipe) => ({
        ...recipe,
        isFavorite: Boolean(recipe.isFavorite),
      }));

      // Sort recipes - favorites first
      const sortedRecipes = processed.sort((a: Recipe, b: Recipe) => {
        // If one is favorite and other is not, favorite comes first
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        // Otherwise sort by creation date (assuming newer recipes should be shown first)
        return 0;
      });

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

  return (
    <>
      <Head>
        <title>All Recipes | Simple Recipes</title>
        <meta name="description" content="Browse all recipes" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              All Recipes
            </h1>
            <p className="mt-2 text-xl text-gray-500">
              Browse through recipes shared by our community
            </p>
          </div>
          {user && (
            <div className="mt-4 sm:mt-0">
              <Link
                href="/recipes/create"
                className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors whitespace-nowrap inline-flex"
              >
                Create New Recipe
              </Link>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 my-12">{error}</div>
        ) : recipes && recipes.length === 0 ? (
          <div className="text-center my-12">
            <p className="text-gray-500 text-lg">No recipes found.</p>
            {user && (
              <p className="mt-4">
                <a
                  href="/recipes/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Create a recipe
                </a>
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recipes &&
              recipes.map((recipe) => (
                <RecipeCard key={recipe._id} recipe={recipe} />
              ))}
          </div>
        )}
      </div>
    </>
  );
}
