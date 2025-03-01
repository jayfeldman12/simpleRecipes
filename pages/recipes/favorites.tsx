import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import { recipeAPI } from "../../src/services/api";

interface Recipe {
  _id: string;
  title: string;
  image: string;
  description: string;
  createdAt: string;
}

const FavoritesPage = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavoriteRecipes = async () => {
      try {
        setLoading(true);
        const data = await recipeAPI.getFavoriteRecipes();
        setRecipes(data.recipes || []);
      } catch (err) {
        console.error("Failed to fetch favorite recipes:", err);
        setError("Failed to load your favorites. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchFavoriteRecipes();
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
                    <button
                      onClick={() => handleRemoveFavorite(recipe._id)}
                      className="absolute top-4 right-4 p-2 rounded-full bg-white shadow-md hover:bg-gray-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-red-500"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="0"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="p-4">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    {recipe.title}
                  </h2>
                  <p className="text-gray-600 line-clamp-2 mb-4">
                    {recipe.description}
                  </p>
                  <Link
                    href={`/recipes/${recipe._id}`}
                    className="text-blue-500 hover:text-blue-700 font-medium"
                  >
                    View Recipe
                  </Link>
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
const WrappedFavoritesPage = () => (
  <ProtectedRoute>
    <FavoritesPage />
  </ProtectedRoute>
);

export default WrappedFavoritesPage;
