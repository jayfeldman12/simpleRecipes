import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../src/context/AuthContext";
import { recipeAPI } from "../src/services/api";

interface Recipe {
  _id: string;
  title: string;
  image: string;
  description: string;
  createdAt: string;
}

export default function Home() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setLoading(true);
        const data = await recipeAPI.getRecipes();
        setRecipes(data.recipes || []);
      } catch (err) {
        console.error("Failed to fetch recipes:", err);
        setError("Failed to load recipes. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, []);

  return (
    <div className="container mx-auto px-4">
      <div className="text-center my-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Simple Recipes
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">{"Welcome!"}</p>

        {!user && (
          <div className="mt-6">
            <Link
              href="/register"
              className="inline-block bg-blue-500 text-white font-bold py-2 px-6 rounded-lg mr-4 hover:bg-blue-600 transition-colors"
            >
              Sign Up
            </Link>
            <Link
              href="/login"
              className="inline-block bg-white text-blue-500 font-bold py-2 px-6 rounded-lg border border-blue-500 hover:bg-blue-50 transition-colors"
            >
              Log In
            </Link>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-500 my-12">{error}</div>
      ) : recipes.length === 0 ? (
        <div className="text-center text-gray-500 my-12">No recipes found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 my-8">
          {recipes.map((recipe) => (
            <Link
              key={recipe._id}
              href={`/recipes/${recipe._id}`}
              className="block bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
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
                <p className="text-gray-600 line-clamp-2">
                  {recipe.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {user && (
        <div className="text-center my-8">
          <Link
            href="/recipes/create"
            className="inline-block bg-green-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-600 transition-colors"
          >
            Create New Recipe
          </Link>
        </div>
      )}
    </div>
  );
}
