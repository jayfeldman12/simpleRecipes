import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import RecipeImportForm from "../../src/components/RecipeImportForm";
import { recipeAPI } from "../../src/services/api";

interface Ingredient {
  name: string;
  amount: string;
}

interface Instruction {
  step: string;
}

const CreateRecipePage = () => {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: "", amount: "" },
  ]);
  const [instructions, setInstructions] = useState<Instruction[]>([
    { step: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImportForm, setShowImportForm] = useState(false);
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleIngredientChange = (
    index: number,
    field: "name" | "amount",
    value: string
  ) => {
    const updatedIngredients = [...ingredients];
    updatedIngredients[index][field] = value;
    setIngredients(updatedIngredients);
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: "", amount: "" }]);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length > 1) {
      const updatedIngredients = [...ingredients];
      updatedIngredients.splice(index, 1);
      setIngredients(updatedIngredients);
    }
  };

  const handleInstructionChange = (index: number, value: string) => {
    const updatedInstructions = [...instructions];
    updatedInstructions[index].step = value;
    setInstructions(updatedInstructions);
  };

  const handleAddInstruction = () => {
    setInstructions([...instructions, { step: "" }]);
  };

  const handleRemoveInstruction = (index: number) => {
    if (instructions.length > 1) {
      const updatedInstructions = [...instructions];
      updatedInstructions.splice(index, 1);
      setInstructions(updatedInstructions);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!title || !description) {
      setError("Title and description are required");
      return;
    }

    if (ingredients.some((ing) => !ing.name || !ing.amount)) {
      setError("All ingredients must have both a name and amount");
      return;
    }

    if (instructions.some((inst) => !inst.step)) {
      setError("All instruction steps must be filled in");
      return;
    }

    const recipeData = {
      title,
      description,
      imageUrl: image,
      cookTime: parseInt(cookTime) || 0,
      servings: parseInt(servings) || 0,
      ingredients,
      instructions,
    };

    try {
      setLoading(true);
      setError(null);

      await recipeAPI.createRecipe(recipeData);
      router.push("/recipes/my-recipes");
    } catch (err) {
      console.error("Failed to create recipe:", err);
      setError("Failed to create recipe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleImportRecipe = (recipe: any) => {
    console.log("recipe that came back", recipe);
    // Set the form values from the imported recipe
    setTitle(recipe.title || "");
    setDescription(recipe.description || "");

    // For cooking time, we convert it to string format for the form
    if (recipe.cookingTime) {
      setCookTime(recipe.cookingTime.toString());
    }

    // For servings, we convert it to string format for the form
    if (recipe.servings) {
      setServings(recipe.servings.toString());
    }

    // For image URL
    if (recipe.imageUrl && recipe.imageUrl !== "default-recipe.jpg") {
      setImage(recipe.imageUrl);
    }

    // For ingredients, we need to transform from string[] to Ingredient[]
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      const formattedIngredients = recipe.ingredients.map(
        (ingredient: string) => {
          // Try to split the ingredient into name and amount
          const match = ingredient.match(
            /([\d\/\.\s]+\s*(?:cup|cups|tablespoon|tablespoons|tbsp|tsp|teaspoon|teaspoons|g|kg|lb|lbs|oz|ml|l|pinch|to taste|handful|clove|cloves)?\s*(?:of)?)(.*)/i
          );

          if (match && match.length >= 3) {
            return {
              amount: match[1].trim(),
              name: match[2].trim(),
            };
          }

          return { amount: "", name: ingredient.trim() };
        }
      );

      setIngredients(formattedIngredients);
    }

    // For instructions, transform from string[] to Instruction[]
    if (recipe.instructions && recipe.instructions.length > 0) {
      const formattedInstructions = recipe.instructions.map(
        (instruction: string) => {
          return { step: instruction.trim() };
        }
      );

      setInstructions(formattedInstructions);
    }

    // Hide the import form
    setShowImportForm(false);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      setIsLoading(true);
      const response = await recipeAPI.importRecipeFromUrl(url);
      console.log("res", response);

      // Check if the response has a recipeId in the expected structure
      if (response && response.recipeId) {
        router.push(`/recipes/${response.recipeId}`);
      } else if (response && response.recipe && response.recipe._id) {
        // Fallback to check if the recipe ID is nested in the recipe object
        router.push(`/recipes/${response.recipe._id}`);
      } else {
        setError("Failed to import recipe. Invalid response format.");
      }
    } catch (error) {
      console.error("Error importing recipe:", error);
      setError("Failed to import recipe. Please try again.");
    } finally {
      setIsLoading(false);
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

          {/* Import from URL option */}
          {!showImportForm ? (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h2 className="text-xl font-semibold mb-4">Quick Import</h2>
              <p className="mb-4">
                Have a recipe from another website? Import it automatically by
                providing the URL.
              </p>
              <button
                type="button"
                onClick={() => setShowImportForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Import from URL
              </button>
            </div>
          ) : (
            <RecipeImportForm onCancel={() => setShowImportForm(false)} />
          )}

          {/* Manual recipe creation form */}
          {!showImportForm && (
            <div className="max-w-3xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-800 mb-6">
                Create New Recipe
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
                    htmlFor="image"
                    className="block text-gray-700 font-medium mb-2"
                  >
                    Image URL
                  </label>
                  <input
                    type="url"
                    id="image"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
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
                      Cook Time (minutes) (optional)
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
                      Servings (optional)
                    </label>
                    <input
                      type="number"
                      id="servings"
                      value={servings}
                      onChange={(e) => setServings(e.target.value)}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">
                    Ingredients*
                  </label>
                  {ingredients.map((ingredient, index) => (
                    <div key={index} className="flex mb-2">
                      <input
                        type="text"
                        value={ingredient.name}
                        onChange={(e) =>
                          handleIngredientChange(index, "name", e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ingredient name"
                        required
                      />
                      <input
                        type="text"
                        value={ingredient.amount}
                        onChange={(e) =>
                          handleIngredientChange(
                            index,
                            "amount",
                            e.target.value
                          )
                        }
                        className="w-1/3 px-3 py-2 border-t border-b border-r border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Amount"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(index)}
                        className="bg-red-500 text-white px-3 py-2 rounded-r-md hover:bg-red-600"
                        disabled={ingredients.length <= 1}
                      >
                        -
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                  >
                    Add Ingredient
                  </button>
                </div>

                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">
                    Instructions*
                  </label>
                  {instructions.map((instruction, index) => (
                    <div key={index} className="flex mb-2">
                      <div className="bg-gray-200 text-gray-700 px-3 py-2 rounded-l-md">
                        {index + 1}.
                      </div>
                      <textarea
                        value={instruction.step}
                        onChange={(e) =>
                          handleInstructionChange(index, e.target.value)
                        }
                        rows={2}
                        className="flex-1 px-3 py-2 border-t border-b border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Instruction step"
                        required
                      ></textarea>
                      <button
                        type="button"
                        onClick={() => handleRemoveInstruction(index)}
                        className="bg-red-500 text-white px-3 py-2 rounded-r-md hover:bg-red-600"
                        disabled={instructions.length <= 1}
                      >
                        -
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddInstruction}
                    className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                  >
                    Add Step
                  </button>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Create Recipe"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default CreateRecipePage;
