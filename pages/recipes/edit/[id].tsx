import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { recipeAPI } from "../../../src/services/api";
import {
  IngredientItem,
  IngredientSection,
  IngredientType,
  InstructionItem,
  Recipe as RecipeType,
} from "../../../src/types/recipe";

export default function EditRecipe() {
  const router = useRouter();
  const { id } = router.query;
  const [recipe, setRecipe] = useState<RecipeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    ingredients: [] as IngredientType[],
    instructions: [] as InstructionItem[],
    cookingTime: "",
    servings: "",
    imageUrl: "",
  });

  // Add refs object to store refs for textareas
  const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement }>({});

  // Function to adjust textarea height
  const adjustTextareaHeight = (index: number) => {
    const textarea = textareaRefs.current[index];
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";

    // Calculate new height (scrollHeight gives content height)
    // Add a little extra padding to prevent scrollbar from appearing prematurely
    const newHeight = textarea.scrollHeight;

    // Set new height
    textarea.style.height = `${newHeight}px`;
  };

  // Effect to adjust textareas when instructions change
  useEffect(() => {
    // Adjust height for all instruction textareas
    formData.instructions.forEach((_, index) => {
      adjustTextareaHeight(index);
    });
  }, [formData.instructions]);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await recipeAPI.getRecipeById(id as string);
        setRecipe(data);
        setFormData({
          title: data.title,
          description: data.description,
          ingredients: data.ingredients,
          instructions: data.instructions,
          cookingTime: data.cookingTime?.toString() || "",
          servings: data.servings?.toString() || "",
          imageUrl: data.imageUrl || "",
        });
      } catch (err) {
        console.error("Failed to fetch recipe:", err);
        setError("Failed to load recipe details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipe || !recipe._id) return;

    try {
      setLoading(true);
      await recipeAPI.updateRecipe(recipe._id as string, {
        ...formData,
        cookingTime: formData.cookingTime
          ? parseInt(formData.cookingTime)
          : undefined,
        servings: formData.servings ? parseInt(formData.servings) : undefined,
      });
      router.push(`/recipes/${recipe._id}`);
    } catch (err) {
      console.error("Failed to update recipe:", err);
      setError("Failed to update recipe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleIngredientChange = (index: number, value: string) => {
    const newIngredients = [...formData.ingredients];
    if ("text" in newIngredients[index]) {
      (newIngredients[index] as IngredientItem).text = value;
    } else if ("sectionTitle" in newIngredients[index]) {
      (newIngredients[index] as IngredientSection).sectionTitle = value;
    }
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const toggleIngredientOptional = (index: number) => {
    const newIngredients = [...formData.ingredients];
    if ("text" in newIngredients[index]) {
      const ingredient = newIngredients[index] as IngredientItem;
      ingredient.optional = !ingredient.optional;
      setFormData({ ...formData, ingredients: newIngredients });
    }
  };

  const handleSubIngredientChange = (
    sectionIndex: number,
    itemIndex: number,
    value: string
  ) => {
    const newIngredients = [...formData.ingredients];
    const section = newIngredients[sectionIndex] as IngredientSection;

    if (section && "ingredients" in section && section.ingredients[itemIndex]) {
      if ("text" in section.ingredients[itemIndex]) {
        (section.ingredients[itemIndex] as IngredientItem).text = value;
        setFormData({ ...formData, ingredients: newIngredients });
      }
    }
  };

  const toggleSubIngredientOptional = (
    sectionIndex: number,
    itemIndex: number
  ) => {
    const newIngredients = [...formData.ingredients];
    const section = newIngredients[sectionIndex] as IngredientSection;

    if (section && "ingredients" in section && section.ingredients[itemIndex]) {
      if ("text" in section.ingredients[itemIndex]) {
        const subIngredient = section.ingredients[itemIndex] as IngredientItem;
        subIngredient.optional = !subIngredient.optional;
        setFormData({ ...formData, ingredients: newIngredients });
      }
    }
  };

  const addSubIngredient = (sectionIndex: number) => {
    const newIngredients = [...formData.ingredients];
    const section = newIngredients[sectionIndex] as IngredientSection;

    if (section && "ingredients" in section) {
      section.ingredients.push({ text: "" });
      setFormData({ ...formData, ingredients: newIngredients });
    }
  };

  const removeSubIngredient = (sectionIndex: number, itemIndex: number) => {
    const newIngredients = [...formData.ingredients];
    const section = newIngredients[sectionIndex] as IngredientSection;

    if (section && "ingredients" in section) {
      section.ingredients = section.ingredients.filter(
        (_, i) => i !== itemIndex
      );
      setFormData({ ...formData, ingredients: newIngredients });
    }
  };

  const handleInstructionChange = (index: number, value: string) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index] = { ...newInstructions[index], text: value };
    setFormData({ ...formData, instructions: newInstructions });

    // Schedule height adjustment for the next render
    setTimeout(() => adjustTextareaHeight(index), 0);
  };

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { text: "" }],
    });
  };

  const addIngredientSection = () => {
    setFormData({
      ...formData,
      ingredients: [
        ...formData.ingredients,
        { sectionTitle: "", ingredients: [] },
      ],
    });
  };

  const addInstruction = () => {
    setFormData({
      ...formData,
      instructions: [...formData.instructions, { text: "" }],
    });
  };

  const removeIngredient = (index: number) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const removeInstruction = (index: number) => {
    const newInstructions = formData.instructions.filter((_, i) => i !== index);
    setFormData({ ...formData, instructions: newInstructions });
  };

  const addIngredientBeforeSection = (sectionIndex: number) => {
    const newIngredients = [...formData.ingredients];
    // Insert a new ingredient at the specified index
    newIngredients.splice(sectionIndex, 0, { text: "" });
    setFormData({ ...formData, ingredients: newIngredients });
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
        <div className="text-center text-red-500 my-12">
          {error || "Recipe not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto my-8 px-4">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Edit Recipe</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="text"
              value={formData.imageUrl}
              onChange={(e) =>
                setFormData({ ...formData, imageUrl: e.target.value })
              }
              className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cooking Time (minutes)
              </label>
              <input
                type="number"
                value={formData.cookingTime}
                onChange={(e) =>
                  setFormData({ ...formData, cookingTime: e.target.value })
                }
                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Servings
              </label>
              <input
                type="number"
                value={formData.servings}
                onChange={(e) =>
                  setFormData({ ...formData, servings: e.target.value })
                }
                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ingredients
            </label>
            <div className="space-y-3">
              {formData.ingredients.map((ingredient, index) => (
                <div key={index}>
                  {/* Add ingredient button before a section */}
                  {"sectionTitle" in ingredient &&
                    index > 0 &&
                    !("sectionTitle" in formData.ingredients[index - 1]) && (
                      <div className="mb-2">
                        <button
                          type="button"
                          onClick={() => addIngredientBeforeSection(index)}
                          className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Add Ingredient
                        </button>
                      </div>
                    )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={
                        "text" in ingredient
                          ? ingredient.text
                          : "sectionTitle" in ingredient
                          ? ingredient.sectionTitle
                          : ""
                      }
                      onChange={(e) =>
                        handleIngredientChange(index, e.target.value)
                      }
                      className={`flex-1 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        "sectionTitle" in ingredient
                          ? "font-bold bg-gray-50"
                          : ""
                      }`}
                      placeholder={
                        "text" in ingredient
                          ? `Ingredient ${index + 1}`
                          : "Section title"
                      }
                      required
                    />
                    {"text" in ingredient && (
                      <div className="flex items-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              "optional" in ingredient
                                ? !!ingredient.optional
                                : false
                            }
                            onChange={() => toggleIngredientOptional(index)}
                            className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                          />
                          <span className="ml-2 text-xs text-gray-600">
                            Optional
                          </span>
                        </label>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    >
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

                  {/* Sub-ingredients for sections */}
                  {"sectionTitle" in ingredient && (
                    <div className="ml-6 mt-2 space-y-2">
                      <div className="text-xs text-gray-500 mb-1">
                        Section Ingredients:
                      </div>
                      {ingredient.ingredients.map((subIngredient, subIndex) => (
                        <div key={subIndex} className="flex gap-2">
                          <input
                            type="text"
                            value={
                              "text" in subIngredient ? subIngredient.text : ""
                            }
                            onChange={(e) =>
                              handleSubIngredientChange(
                                index,
                                subIndex,
                                e.target.value
                              )
                            }
                            className="flex-1 px-3 py-1 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Sub-ingredient ${subIndex + 1}`}
                          />
                          {"text" in subIngredient && (
                            <div className="flex items-center">
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={
                                    "optional" in subIngredient
                                      ? !!subIngredient.optional
                                      : false
                                  }
                                  onChange={() =>
                                    toggleSubIngredientOptional(index, subIndex)
                                  }
                                  className="form-checkbox h-3 w-3 text-blue-600 transition duration-150 ease-in-out"
                                />
                                <span className="ml-1 text-xs text-gray-600">
                                  Opt
                                </span>
                              </label>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeSubIngredient(index, subIndex)}
                            className="px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
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
                      ))}
                      <button
                        type="button"
                        onClick={() => addSubIngredient(index)}
                        className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Add Sub-ingredient
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  onClick={addIngredient}
                  className="inline-flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Add Ingredient
                </button>
                <button
                  type="button"
                  onClick={addIngredientSection}
                  className="inline-flex items-center px-3 py-2 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Add Section
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions
            </label>
            <div className="space-y-3">
              {formData.instructions.map((instruction, index) => (
                <div key={index} className="flex gap-2">
                  <textarea
                    value={instruction.text}
                    onChange={(e) =>
                      handleInstructionChange(index, e.target.value)
                    }
                    ref={(el) => {
                      if (el) textareaRefs.current[index] = el;
                    }}
                    className="flex-1 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Step ${index + 1}`}
                    style={{ minHeight: "60px", overflow: "hidden" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                  >
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
              ))}
              <button
                type="button"
                onClick={addInstruction}
                className="inline-flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Add Instruction
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={() => router.push(`/recipes/${recipe._id}`)}
              className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
