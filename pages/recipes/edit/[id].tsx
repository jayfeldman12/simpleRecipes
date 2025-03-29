import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { recipeAPI } from "../../../src/services/api";
import {
  IngredientItem,
  IngredientSection,
  IngredientType,
  InstructionItem,
  Recipe as RecipeType,
  Tag,
} from "../../../src/types/recipe";
import TagSelector from "../../components/TagSelector";

export default function EditRecipe() {
  const router = useRouter();
  const { id } = router.query;
  const [recipe, setRecipe] = useState<RecipeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    ingredients: [] as IngredientType[],
    instructions: [] as InstructionItem[],
    cookingTime: "",
    servings: "",
    imageUrl: "",
    tags: [] as Tag[],
  });

  // Add refs object to store refs for textareas
  const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement }>({});

  // Add a state to track mobile view
  const [isMobile, setIsMobile] = useState(false);

  // Update useEffect to detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // Initial check
    checkMobile();

    // Add event listener for resize
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Update the adjustTextareaHeight function to respect mobile setting
  const adjustTextareaHeight = (index: number) => {
    const textarea = textareaRefs.current[index];
    if (!textarea || isMobile) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";

    // Calculate new height (scrollHeight gives content height)
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
          tags: data.tags || [],
        });
      } catch (err) {
        console.error("Failed to fetch recipe:", err);
        setError("Failed to load recipe details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    const fetchTags = async () => {
      try {
        const tags = await recipeAPI.getAllTags();
        setAvailableTags(tags);

        // Also fetch the recipes to calculate tag counts
        const recipes = await recipeAPI.getRecipes();

        // Calculate tag counts from all recipes
        const counts: Record<string, number> = {};
        if (Array.isArray(recipes)) {
          recipes.forEach((recipe) => {
            if (recipe.tags && recipe.tags.length > 0) {
              recipe.tags.forEach((tag: { _id: string }) => {
                counts[tag._id] = (counts[tag._id] || 0) + 1;
              });
            }
          });
        } else if (recipes && recipes.recipes) {
          recipes.recipes.forEach((recipe) => {
            if (recipe.tags && recipe.tags.length > 0) {
              recipe.tags.forEach((tag: { _id: string }) => {
                counts[tag._id] = (counts[tag._id] || 0) + 1;
              });
            }
          });
        }
        setTagCounts(counts);
      } catch (err) {
        console.error("Error fetching tags:", err);
      }
    };

    fetchRecipe();
    fetchTags();
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
    <div className="container max-w-4xl mx-auto my-4 sm:my-8 px-2 sm:px-4">
      <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">
          Edit Recipe
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <TagSelector
              availableTags={availableTags}
              selectedTags={formData.tags || []}
              onChange={(selected) =>
                setFormData({ ...formData, tags: selected })
              }
              className="border border-gray-300 rounded-md p-3"
              recipeCounts={tagCounts}
            />
          </div>

          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
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
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Add Ingredient
                        </button>
                      </div>
                    )}
                  <div className="flex flex-col sm:flex-row gap-2">
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
                      className={`flex-1 px-3 sm:px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                    <div className="flex items-center justify-between sm:justify-start">
                      {"text" in ingredient && (
                        <div className="flex items-center mr-2">
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
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Sub-ingredients for sections */}
                  {"sectionTitle" in ingredient && (
                    <div className="ml-3 sm:ml-6 mt-2 space-y-2">
                      <div className="text-xs text-gray-500 mb-1">
                        Section Ingredients:
                      </div>
                      {ingredient.ingredients.map((subIngredient, subIndex) => (
                        <div
                          key={subIndex}
                          className="flex flex-col sm:flex-row gap-2"
                        >
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
                          <div className="flex items-center justify-between sm:justify-start">
                            {"text" in subIngredient && (
                              <div className="flex items-center mr-2">
                                <label className="inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={
                                      "optional" in subIngredient
                                        ? !!subIngredient.optional
                                        : false
                                    }
                                    onChange={() =>
                                      toggleSubIngredientOptional(
                                        index,
                                        subIndex
                                      )
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
                              onClick={() =>
                                removeSubIngredient(index, subIndex)
                              }
                              className="px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addSubIngredient(index)}
                        className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
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
                  <PlusIcon className="h-5 w-5 mr-1" />
                  Add Ingredient
                </button>
                <button
                  type="button"
                  onClick={addIngredientSection}
                  className="inline-flex items-center px-3 py-2 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mr-1" />
                  Add Section
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions
            </label>
            <div className="space-y-3">
              {formData.instructions.map((instruction, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2">
                  <textarea
                    value={instruction.text}
                    onChange={(e) =>
                      handleInstructionChange(index, e.target.value)
                    }
                    ref={(el) => {
                      if (el) textareaRefs.current[index] = el;
                    }}
                    className={`flex-1 px-3 sm:px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isMobile
                        ? "max-h-[120px] overflow-auto"
                        : "overflow-hidden"
                    }`}
                    placeholder={`Step ${index + 1}`}
                    style={{ minHeight: "60px" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    className="self-start sm:self-center px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addInstruction}
                className="inline-flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-1" />
                Add Instruction
              </button>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 sm:px-4 py-2 sm:py-3 flex justify-end gap-2 sm:gap-4 z-10 shadow-md">
            <div className="w-full mx-auto flex justify-end gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => router.push(`/recipes/${recipe._id}`)}
                className="px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 sm:px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm sm:text-base"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <div className="pb-16 sm:pb-20"></div>
        </form>
      </div>
    </div>
  );
}
