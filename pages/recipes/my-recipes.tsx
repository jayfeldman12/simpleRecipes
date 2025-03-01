import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import { useAuth } from "../../src/context/AuthContext";
import { recipeAPI } from "../../src/services/api";

interface Recipe {
  _id: string;
  title: string;
  image: string;
  description: string;
  createdAt: string;
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
        setRecipes(data.recipes || []);
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
    <>
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
              <div
                key={recipe._id}
                className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
              >
                {recipe.image && (
                  <div className="relative h-48 w-full">
                    <Image
                      src={recipe.image}
                      alt={recipe.title}
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                )}
                <div className="p-4">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    {recipe.title}
                  </h2>
                  <p className="text-gray-600 line-clamp-2 mb-4">
                    {recipe.description}
                  </p>
                  <div className="flex justify-between items-center mt-4">
                    <Link
                      href={`/recipes/${recipe._id}`}
                      className="text-blue-500 hover:text-blue-700 font-medium"
                    >
                      View Recipe
                    </Link>
                    <div className="flex space-x-2">
                      <Link
                        href={`/recipes/edit/${recipe._id}`}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <span className="sr-only">Edit</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => handleDeleteRecipe(recipe._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <span className="sr-only">Delete</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// Wrap the page with ProtectedRoute to require authentication
const WrappedMyRecipesPage = () => (
  <ProtectedRoute>
    <MyRecipesPage />
  </ProtectedRoute>
);

export default WrappedMyRecipesPage;
