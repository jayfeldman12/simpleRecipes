import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAuth } from "../../src/context/AuthContext";
import RecipeCard from "../components/RecipeCard";

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
}

export default function RecipeList() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/recipes");

        if (!response.ok) {
          throw new Error("Failed to fetch recipes");
        }

        const data = await response.json();

        // Ensure we have an array of recipes
        if (Array.isArray(data)) {
          setRecipes(data);
        } else if (data && Array.isArray(data.recipes)) {
          // Handle case where API returns { recipes: [...] }
          setRecipes(data.recipes);
        } else {
          console.error("Unexpected data format:", data);
          setRecipes([]);
          setError("Received invalid data format from server");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, []);

  return (
    <>
      <Head>
        <title>All Recipes | Simple Recipes</title>
        <meta name="description" content="Browse all recipes" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            All Recipes
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Browse through recipes shared by our community
          </p>
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
          <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
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
