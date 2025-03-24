import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import SearchBar from "../../src/components/SearchBar";
import { recipeAPI } from "../../src/services/api";
import { Recipe as ImportedRecipe } from "../../src/types/recipe";
import RecipeCard, { favoritesUpdated } from "../components/RecipeCard";

// Local recipe type with required _id
interface Recipe extends Omit<ImportedRecipe, "_id"> {
  _id: string;
  isFavorite?: boolean;
}

export default function RecipeList() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: session } = useSession();
  const user = session?.user;

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
      const processed = recipesArray.map((recipe) => ({
        ...recipe,
        isFavorite: Boolean(recipe.isFavorite),
      })) as Recipe[];

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

  if (loading) {
    return (
      <div className="container mx-auto mt-8 px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe._id}
                recipe={recipe}
                onDelete={undefined}
                isEditable={false}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
