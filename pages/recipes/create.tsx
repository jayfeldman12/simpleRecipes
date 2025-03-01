import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import ProtectedRoute from "../../src/components/ProtectedRoute";
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
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      image: image || "https://via.placeholder.com/400x300?text=No+Image",
      prepTime: parseInt(prepTime) || 0,
      cookTime: parseInt(cookTime) || 0,
      servings: parseInt(servings) || 0,
      ingredients,
      instructions,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag),
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

  return (
    <>
      <Head>
        <title>Create Recipe | Simple Recipes</title>
      </Head>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/recipes/my-recipes"
            className="inline-block mb-6 text-blue-500 hover:underline font-medium"
          >
            ← Back to My Recipes
          </Link>

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
                      handleIngredientChange(index, "amount", e.target.value)
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

            <div className="mb-6">
              <label
                htmlFor="tags"
                className="block text-gray-700 font-medium mb-2"
              >
                Tags (comma-separated)
              </label>
              <input
                type="text"
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="vegan, dessert, easy"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push("/recipes/my-recipes")}
                className="mr-4 px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Recipe"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

// Wrap the page with ProtectedRoute to require authentication
const WrappedCreateRecipePage = () => (
  <ProtectedRoute>
    <CreateRecipePage />
  </ProtectedRoute>
);

export default WrappedCreateRecipePage;
