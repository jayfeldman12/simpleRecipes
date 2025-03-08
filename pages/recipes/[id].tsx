import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAuth } from "../../src/context/AuthContext";
import { recipeAPI } from "../../src/services/api";
import { favoritesUpdated } from "../components/RecipeCard";

interface Recipe {
  _id: string;
  title: string;
  imageUrl: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cookingTime?: number;
  servings?: number;
  fullRecipe?: string;
  sourceUrl?: string;
  user: {
    _id: string;
    username: string;
  };
  createdAt: string;
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
  const [previousPage, setPreviousPage] = useState("/recipes");

  useEffect(() => {
    // Get the previous page from the query parameter
    const from = router.query.from as string;
    if (from) {
      setPreviousPage(from);
    }
  }, [router.query.from]);

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
      // Optimistically update UI before API call completes
      const newFavoriteStatus = !isFavorite;
      setIsFavorite(newFavoriteStatus);

      // Dispatch global event to update other instances of this recipe
      const event = new CustomEvent("favoritesChanged", {
        detail: {
          recipeId: recipe._id,
          isFavorite: newFavoriteStatus,
        },
      });
      favoritesUpdated.dispatchEvent(event);

      // Now make the actual API call
      if (newFavoriteStatus) {
        await recipeAPI.addToFavorites(recipe._id);
      } else {
        await recipeAPI.removeFromFavorites(recipe._id);
      }
    } catch (err) {
      // If API call fails, revert the optimistic update
      console.error("Failed to update favorite status:", err);
      setIsFavorite(!isFavorite); // Restore previous state

      // Dispatch event to update other components with the reverted state
      const revertEvent = new CustomEvent("favoritesChanged", {
        detail: {
          recipeId: recipe._id,
          isFavorite: !isFavorite, // The original state
        },
      });
      favoritesUpdated.dispatchEvent(revertEvent);
    }
  };

  // Listen for favorite changes from other components
  useEffect(() => {
    const handleFavoritesChange = (e: Event) => {
      if (e instanceof CustomEvent && e.detail && recipe) {
        const { recipeId, isFavorite: newStatus } = e.detail;
        if (recipe._id === recipeId) {
          setIsFavorite(newStatus);
        }
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
  }, [recipe]);

  const handleDelete = async () => {
    if (!recipe) return;

    if (window.confirm("Are you sure you want to delete this recipe?")) {
      try {
        await recipeAPI.deleteRecipe(recipe._id);
        router.push("/recipes/my-recipes");
      } catch (err) {
        console.error("Failed to delete recipe:", err);
        setError("Failed to delete recipe. Please try again.");
      }
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
    <>
      <Head>
        <title>{recipe.title} | Simple Recipes</title>
        <meta name="description" content={recipe.description} />
      </Head>

      {/* Desktop Version */}
      <div className="container max-w-6xl mx-auto my-8 px-4 md:block hidden">
        <Link
          href={previousPage}
          className="inline-block mb-6 text-blue-500 hover:underline font-medium"
        >
          ← Back to Recipes
        </Link>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {recipe.imageUrl && (
            <div className="h-64 sm:h-80 relative">
              <img
                src={recipe.imageUrl}
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
            <div className="mb-6">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-3xl font-bold text-gray-800">
                  {recipe.title}
                </h1>
                {user && user._id === recipe.user._id && (
                  <div className="flex gap-2">
                    <Link
                      href={`/recipes/edit/${recipe._id}`}
                      className="p-2 text-blue-600 hover:text-blue-800"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </Link>
                    <button
                      onClick={handleDelete}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <p className="text-gray-600 mb-4">{recipe.description}</p>

              {/* Display metadata: cooking time, servings, source */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                {recipe.cookingTime && (
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-1 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{recipe.cookingTime} minutes</span>
                  </div>
                )}

                {recipe.servings && (
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-1 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <span>{recipe.servings} servings</span>
                  </div>
                )}
              </div>

              {/* Source URL and Full Recipe links */}
              <div className="flex flex-wrap gap-4">
                {recipe.sourceUrl && (
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline flex items-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    View Original Recipe
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-row gap-8">
              <div className="w-1/3">
                <div className="bg-gray-50 rounded-lg border border-gray-200 h-auto max-h-[600px] overflow-y-auto">
                  <div className="sticky top-0 bg-gray-50 z-10 p-4 pb-2 border-b border-gray-100">
                    <h2 className="text-xl font-semibold">Ingredients</h2>
                  </div>
                  <div className="px-4 pb-4">
                    <ul className="space-y-3 mt-3">
                      {recipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="text-gray-700 text-lg">
                          {ingredient}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="w-2/3">
                <div className="h-auto max-h-[600px] overflow-y-auto pr-4">
                  <div className="sticky top-0 bg-white z-10 pb-2 border-b border-gray-100">
                    <h2 className="text-xl font-semibold">Instructions</h2>
                  </div>
                  <ol className="space-y-6 mt-4 list-decimal pl-6">
                    {recipe.instructions.map((instruction, index) => (
                      <li
                        key={index}
                        className="text-gray-700 text-lg leading-relaxed"
                      >
                        {instruction}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Version - Fixed layout to prevent page scrolling */}
      <div className="md:hidden fixed inset-0 flex flex-col overflow-hidden bg-white">
        {/* Header with Back Button */}
        <div className="bg-white py-2 px-3 border-b border-gray-200 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <Link
              href={previousPage}
              className="text-blue-500 flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </Link>
            {user && (
              <button onClick={handleFavoriteToggle} className="p-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 ${
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
          {/* Mobile Recipe Title & Description */}
          <h1 className="text-2xl font-bold text-gray-800 mt-1">
            {recipe.title}
          </h1>
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
            {recipe.description}
          </p>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Ingredients Section - Top 1/3 */}
          <div className="bg-gray-50 border-b border-gray-200 h-2/5 overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 z-10 py-1 px-3 border-b border-gray-100">
              <h2 className="text-lg font-semibold">Ingredients</h2>
            </div>
            <ul className="space-y-1 p-3 pt-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="text-gray-700 text-base">
                  {ingredient}
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions Section - Bottom 2/3 */}
          <div className="flex-1 h-3/5 overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 py-1 px-3 border-b border-gray-100">
              <h2 className="text-lg font-semibold">Instructions</h2>
            </div>
            <ol className="space-y-3 p-3 pt-2">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="ml-5 list-decimal text-base">
                  <p className="text-gray-700">{instruction}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-gray-200 py-2 px-3 z-10">
          <div className="flex justify-center">
            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-100 text-blue-600 py-1 px-4 rounded-md text-center text-sm w-auto mx-auto"
              >
                View Original
              </a>
            )}
          </div>
          {user && user._id === recipe.user._id && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Link
                href={`/recipes/edit/${recipe._id}`}
                className="bg-gray-100 text-gray-600 py-1 px-3 rounded-md text-center text-sm"
              >
                Edit Recipe
              </Link>
              <button
                onClick={handleDelete}
                className="bg-red-100 text-red-600 py-1 px-3 rounded-md text-center text-sm"
              >
                Delete Recipe
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
