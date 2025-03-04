import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { recipeAPI } from "../../../src/services/api";

interface Recipe {
  _id: string;
  title: string;
  fullRecipe?: string;
  sourceUrl?: string;
}

export default function FullRecipe() {
  const router = useRouter();
  const { id } = router.query;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await recipeAPI.getRecipeById(id as string);
        setRecipe(data);

        // If no full recipe text is available, show an error
        if (!data.fullRecipe) {
          setError("No full recipe text available for this recipe.");
        }
      } catch (err) {
        console.error("Failed to fetch recipe:", err);
        setError("Failed to load recipe details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

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
        <Link
          href={id ? `/recipes/${id}` : "/recipes"}
          className="text-blue-500 hover:underline font-medium"
        >
          ← Back to Recipe
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
        <title>Full Recipe: {recipe.title} | Simple Recipes</title>
      </Head>

      <div className="container max-w-4xl mx-auto my-8 px-4">
        <Link
          href={`/recipes/${recipe._id}`}
          className="inline-block mb-6 text-blue-500 hover:underline font-medium"
        >
          ← Back to Recipe
        </Link>

        <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Full Recipe: {recipe.title}
          </h1>

          {recipe.sourceUrl && (
            <div className="mb-6">
              <p className="text-gray-600">
                Original source:{" "}
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {recipe.sourceUrl}
                </a>
              </p>
            </div>
          )}

          {recipe.fullRecipe ? (
            <div className="prose max-w-none">
              {/* Display the full recipe content in a pre tag to preserve formatting */}
              <pre className="whitespace-pre-wrap font-sans text-gray-800 text-base">
                {recipe.fullRecipe}
              </pre>
            </div>
          ) : (
            <p className="text-gray-600">
              No full recipe text available for this recipe.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
