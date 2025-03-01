import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAuth } from "../../src/context/AuthContext";
import { recipeAPI } from "../../src/services/api";

interface Recipe {
  _id: string;
  title: string;
  image: string;
  description: string;
  ingredients: Array<{ name: string; amount: string }>;
  instructions: Array<{ step: string }>;
  createdBy: string;
  isFavorite?: boolean;
}

export default function RecipeDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await recipeAPI.getRecipeById(id as string);
        setRecipe(data);
        setIsFavorite(data.isFavorite || false);
      } catch (err) {
        console.error("Failed to fetch recipe:", err);
        setError("Failed to load recipe details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  const handleFavoriteToggle = async () => {
    if (!user || !recipe) return;

    try {
      if (isFavorite) {
        await recipeAPI.removeFromFavorites(recipe._id);
      } else {
        await recipeAPI.addToFavorites(recipe._id);
      }
      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error("Failed to update favorite status:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="container max-w-4xl mx-auto my-8 px-4">
        <Link href="/" className="text-blue-500 hover:underline font-medium">
          ← Back to Home
        </Link>
        <div className="text-center text-red-500 my-12">
          {error || "Recipe not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto my-8 px-4">
      <Link
        href="/"
        className="inline-block mb-6 text-blue-500 hover:underline font-medium"
      >
        ← Back to Home
      </Link>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {recipe.image && (
          <div className="h-64 sm:h-80 relative">
            <img
              src={recipe.image}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            {user && (
              <button
                onClick={handleFavoriteToggle}
                className="absolute top-4 right-4 p-2 rounded-full bg-white shadow-md hover:bg-gray-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-6 w-6 ${
                    isFavorite ? "text-red-500" : "text-gray-400"
                  }`}
                  fill={isFavorite ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={isFavorite ? "0" : "2"}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            {recipe.title}
          </h1>
          <p className="text-gray-600 mb-6">{recipe.description}</p>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex justify-between">
                      <span className="font-medium">{ingredient.name}</span>
                      <span className="text-gray-600">{ingredient.amount}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="md:w-2/3">
              <h2 className="text-xl font-semibold mb-4">Instructions</h2>
              <ol className="space-y-4">
                {recipe.instructions.map((instruction, index) => (
                  <li key={index} className="ml-6 list-decimal">
                    <p>{instruction.step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
