import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import { recipeAPI } from "../../src/services/api";

interface Ingredient {
  amount: string;
  name: string;
}

const CreateRecipePage = () => {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { amount: "", name: "" },
  ]);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL import states
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title || !description) {
      setError("Title and description are required.");
      return;
    }

    // Filter out empty ingredients and instructions
    const filteredIngredients = ingredients.filter(
      (ing) => ing.amount.trim() || ing.name.trim()
    );
    const filteredInstructions = instructions.filter((inst) => inst.trim());

    if (filteredIngredients.length === 0) {
      setError("At least one ingredient is required.");
      return;
    }

    if (filteredInstructions.length === 0) {
      setError("At least one instruction is required.");
      return;
    }

    try {
      setIsLoading(true);

      const recipeData = {
        title,
        description,
        imageUrl: imageUrl || undefined,
        prepTimeMinutes: prepTime ? parseInt(prepTime) : undefined,
        cookTimeMinutes: cookTime ? parseInt(cookTime) : undefined,
        servings: servings ? parseInt(servings) : undefined,
        ingredients: filteredIngredients,
        instructions: filteredInstructions,
      };

      const result = await recipeAPI.createRecipe(recipeData);
      router.push(`/recipes/${result.id}`);
    } catch (err: any) {
      console.error("Error creating recipe:", err);
      setError(
        err.message || "Failed to create recipe. Please try again later."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { amount: "", name: "" }]);
  };

  const handleRemoveIngredient = (index: number) => {
    const newIngredients = [...ingredients];
    newIngredients.splice(index, 1);
    setIngredients(newIngredients);
  };

  const handleIngredientChange = (
    index: number,
    field: keyof Ingredient,
    value: string
  ) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = value;
    setIngredients(newIngredients);
  };

  const handleAddInstruction = () => {
    setInstructions([...instructions, ""]);
  };

  const handleRemoveInstruction = (index: number) => {
    const newInstructions = [...instructions];
    newInstructions.splice(index, 1);
    setInstructions(newInstructions);
  };

  const handleInstructionChange = (index: number, value: string) => {
    const newInstructions = [...instructions];
    newInstructions[index] = value;
    setInstructions(newInstructions);
  };

  const handleImportRecipe = (recipeData: any) => {
    // Update page title to indicate we're editing an imported recipe
    document.title = `Edit Imported Recipe - ${recipeData.title || "Recipe"}`;

    // Update form with imported recipe data
    setTitle(recipeData.title || "");
    setDescription(recipeData.description || "");
    setCookTime(
      recipeData.cookTimeMinutes?.toString() ||
        recipeData.cookingTime?.toString() ||
        ""
    );
    setServings(recipeData.servings?.toString() || "");
    setPrepTime(recipeData.prepTimeMinutes?.toString() || "");
    setImageUrl(recipeData.imageUrl || "");

    // Parse ingredients
    if (recipeData.ingredients && recipeData.ingredients.length > 0) {
      const parsedIngredients = recipeData.ingredients.map(
        (ingredientStr: string) => {
          // Try to extract amount and name with a regex
          const match = ingredientStr.match(/^([\d\s\/\.\,]+)(.+)$/);
          if (match) {
            return {
              amount: match[1].trim(),
              name: match[2].trim(),
            };
          }
          return { amount: "", name: ingredientStr.trim() };
        }
      );
      setIngredients(parsedIngredients);
    }

    // Set instructions
    if (recipeData.instructions && recipeData.instructions.length > 0) {
      setInstructions(recipeData.instructions);
    }
  };

  const handleImport = async () => {
    setError(null);
    setImportStatus(null);

    // Validate URL
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    try {
      const urlToTest = url.match(/^https?:\/\//) ? url : `https://${url}`;
      new URL(urlToTest);
    } catch (err) {
      setError("Please enter a valid URL");
      return;
    }

    try {
      setImporting(true);
      setImportStatus("Fetching recipe page...");

      const result = await recipeAPI.importRecipeFromUrl(url);

      if (result && result.recipe) {
        handleImportRecipe(result.recipe);

        if (result.recipeId) {
          setImportStatus(
            "Recipe imported successfully! Redirecting to recipe page..."
          );

          setTimeout(() => {
            router.push(`/recipes/${result.recipeId}`);
          }, 1000);
        } else {
          setImportStatus(
            "Recipe imported successfully! You can make additional edits below."
          );
        }

        setUrl("");
      } else {
        setError(
          "Could not import recipe. Please check the URL and try again."
        );
      }
    } catch (err: any) {
      console.error("Error importing recipe:", err);
      if (err.status === 400) {
        setError(
          "Failed to extract recipe data from the provided URL. Please make sure it's a valid recipe page."
        );
      } else if (err.status === 401) {
        setError("You need to be logged in to import recipes.");
      } else if (err.status === 500) {
        setError(
          "Server error. Please try again later or try a different URL."
        );
      } else {
        setError(
          err.message || "Failed to import recipe. Please try a different URL."
        );
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Head>
          <title>Create Recipe | Simple Recipes</title>
          <meta
            name="description"
            content="Create a new recipe on Simple Recipes"
          />
        </Head>

        <div className="max-w-4xl mx-auto pt-10 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Create Recipe</h1>
            <Link
              href="/recipes"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
            >
              Back to Recipes
            </Link>
          </div>

          {/* URL import section */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Quick Import</h2>
            <p className="mb-4">
              Have a recipe from another website? Import it automatically by
              providing the URL.
            </p>

            {importStatus && !error && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                <div dangerouslySetInnerHTML={{ __html: importStatus }} />
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleImport();
              }}
              className="flex flex-col sm:flex-row items-center gap-3"
            >
              <input
                type="url"
                placeholder="https://example.com/recipe"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={importing}
              />
              <button
                type="submit"
                className="w-full sm:w-auto mt-2 sm:mt-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-center sm:whitespace-nowrap"
                disabled={importing}
              >
                {importing ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Importing...
                  </>
                ) : (
                  "Import Recipe"
                )}
              </button>
            </form>
            <p className="text-sm text-gray-500 mt-1">
              Paste a URL to a recipe page and we'll automatically extract the
              recipe details
            </p>
          </div>

          {/* Manual recipe creation form */}
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
              {importStatus ? "Edit Imported Recipe" : "Create New Recipe"}
            </h1>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="bg-white shadow-md rounded-lg p-6"
            >
              <div className="mb-6">
                <label
                  htmlFor="title"
                  className="block text-gray-700 font-medium mb-2"
                >
                  Title*
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Recipe title"
                  required
                />
              </div>

              <div className="mb-6">
                <label
                  htmlFor="description"
                  className="block text-gray-700 font-medium mb-2"
                >
                  Description*
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your recipe"
                  required
                ></textarea>
              </div>

              <div className="mb-6">
                <label
                  htmlFor="imageUrl"
                  className="block text-gray-700 font-medium mb-2"
                >
                  Image URL
                </label>
                <input
                  type="url"
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label
                    htmlFor="prepTime"
                    className="block text-gray-700 font-medium mb-2"
                  >
                    Prep Time (minutes)
                  </label>
                  <input
                    type="number"
                    id="prepTime"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cookTime"
                    className="block text-gray-700 font-medium mb-2"
                  >
                    Cook Time (minutes)
                  </label>
                  <input
                    type="number"
                    id="cookTime"
                    value={cookTime}
                    onChange={(e) => setCookTime(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="servings"
                    className="block text-gray-700 font-medium mb-2"
                  >
                    Servings
                  </label>
                  <input
                    type="number"
                    id="servings"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-gray-700 font-medium">
                    Ingredients*
                  </label>
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    + Add Ingredient
                  </button>
                </div>
                {ingredients.map((ingredient, index) => (
                  <div
                    key={`ingredient-${index}`}
                    className="flex gap-2 mb-2 items-center"
                  >
                    <input
                      type="text"
                      value={ingredient.amount}
                      onChange={(e) =>
                        handleIngredientChange(index, "amount", e.target.value)
                      }
                      className="w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Amount"
                    />
                    <input
                      type="text"
                      value={ingredient.name}
                      onChange={(e) =>
                        handleIngredientChange(index, "name", e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ingredient name"
                    />
                    {ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-gray-700 font-medium">
                    Instructions*
                  </label>
                  <button
                    type="button"
                    onClick={handleAddInstruction}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    + Add Step
                  </button>
                </div>
                {instructions.map((instruction, index) => (
                  <div
                    key={`instruction-${index}`}
                    className="flex gap-2 mb-2 items-start"
                  >
                    <span className="mt-2 text-gray-500 font-medium">
                      {index + 1}.
                    </span>
                    <textarea
                      value={instruction}
                      onChange={(e) =>
                        handleInstructionChange(index, e.target.value)
                      }
                      rows={2}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Instruction step"
                    />
                    {instructions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveInstruction(index)}
                        className="text-red-500 hover:text-red-700 mt-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating..." : "Create Recipe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default CreateRecipePage;
