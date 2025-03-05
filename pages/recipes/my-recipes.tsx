import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import { useAuth } from "../../src/context/AuthContext";
import { recipeAPI } from "../../src/services/api";
import RecipeCard from "../components/RecipeCard";

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

        setRecipes(processedRecipes);
      } catch (err) {
        console.error("Failed to fetch recipes:", err);
        setError("Failed to load your recipes. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserRecipes();
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

  return (
    <ProtectedRoute>
      <Head>
        <title>My Recipes | Simple Recipes</title>
      </Head>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Recipes</h1>
          <Link
            href="/recipes/create"
            className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Create New Recipe
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 my-12">{error}</div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <h2 className="text-2xl font-medium text-gray-700 mb-4">
              You haven't created any recipes yet
            </h2>
            <p className="text-gray-500 mb-6">
              Start sharing your culinary creations with the world!
            </p>
            <Link
              href="/recipes/create"
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Create Your First Recipe
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe._id}
                recipe={recipe}
                isEditable={true}
                onDelete={handleDeleteRecipe}
              />
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default MyRecipesPage;
