import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import { recipeAPI } from "../../src/services/api";
import {
  IngredientItem,
  IngredientSection,
  IngredientType,
  InstructionItem,
} from "../../src/types/recipe";

const CreateRecipePage = () => {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");

  // Default to a single empty ingredient
  const [ingredients, setIngredients] = useState<IngredientType[]>([
    { text: "" },
  ]);

  // Track if we have any ingredient sections
  const [hasIngredientSections, setHasIngredientSections] = useState(false);

  // Default to a single empty instruction
  const [instructions, setInstructions] = useState<InstructionItem[]>([
    { text: "" },
  ]);

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

    // Filter out empty ingredients
    const filteredIngredients = hasIngredientSections
      ? ingredients.filter((item) => {
          if ("sectionTitle" in item) {
            // For sections, keep if they have a title and at least one non-empty ingredient
            return (
              item.sectionTitle.trim() &&
              item.ingredients.some((ing) =>
                "text" in ing ? ing.text.trim() : true
              )
            );
          } else {
            // For regular ingredients, keep if they have text
            return item.text.trim();
          }
        })
      : ingredients.filter((item) => "text" in item && item.text.trim());

    // Filter out empty instructions
    const filteredInstructions = instructions.filter((inst) =>
      inst.text.trim()
    );

    if (filteredIngredients.length === 0) {
      setError("At least one ingredient is required.");
      return;
    }

    if (filteredInstructions.length === 0) {
      setError("At least one instruction is required.");
      return;
    }

    // Calculate cooking time from prep + cook time
    let cookingTime = null;
    if (prepTime && cookTime) {
      cookingTime = parseInt(prepTime) + parseInt(cookTime);
    } else if (prepTime) {
      cookingTime = parseInt(prepTime);
    } else if (cookTime) {
      cookingTime = parseInt(cookTime);
    }

    const recipeData = {
      title,
      description,
      ingredients: filteredIngredients,
      instructions: filteredInstructions,
      cookingTime: cookingTime || undefined,
      servings: servings ? parseInt(servings) : undefined,
      imageUrl: imageUrl || undefined,
      sourceUrl: url || undefined,
    };

    try {
      setIsLoading(true);
      const response = await recipeAPI.createRecipe(recipeData);
      router.push(`/recipes/${response._id}`);
    } catch (err) {
      console.error("Failed to create recipe:", err);
      setError("Failed to create recipe. Please try again.");
      setIsLoading(false);
    }
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { text: "" }]);
  };

  const handleRemoveIngredient = (index: number) => {
    const newIngredients = [...ingredients];
    newIngredients.splice(index, 1);
    setIngredients(newIngredients);
  };

  const handleIngredientChange = (index: number, value: string) => {
    const newIngredients = [...ingredients];

    // Check if this ingredient is a simple ingredient item
    if ("text" in newIngredients[index]) {
      (newIngredients[index] as IngredientItem).text = value;
    }

    setIngredients(newIngredients);
  };

  const handleAddInstruction = () => {
    setInstructions([...instructions, { text: "" }]);
  };

  const handleRemoveInstruction = (index: number) => {
    const newInstructions = [...instructions];
    newInstructions.splice(index, 1);
    setInstructions(newInstructions);
  };

  const handleInstructionChange = (index: number, value: string) => {
    const newInstructions = [...instructions];
    newInstructions[index].text = value;
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
      // The imported data is already in the correct format
      // We need to convert it if needed
      const parsedIngredients = recipeData.ingredients.map(
        (ingredient: any) => {
          if (typeof ingredient === "string") {
            // Legacy string format - convert to object
            const match = ingredient.match(/^([\d\s\/\.\,]+)(.+)$/);
            if (match) {
              return {
                text: ingredient,
                optional: false,
              };
            }
            return { text: ingredient, optional: false };
          }
          return ingredient; // Already in the correct format
        }
      );
      setIngredients(parsedIngredients);
    }

    // Set instructions
    if (recipeData.instructions && recipeData.instructions.length > 0) {
      // Handle instructions that might be in string format
      const parsedInstructions = recipeData.instructions.map(
        (instruction: any) => {
          if (typeof instruction === "string") {
            return { text: instruction };
          }
          return instruction; // Already in the correct format
        }
      );
      setInstructions(parsedInstructions);
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
                  <label className="block text-gray-700 font-semibold">
                    Ingredients
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
                  <div key={index} className="flex items-center gap-2 mb-2">
                    {/* Check if this is a regular ingredient or a section */}
                    {"text" in ingredient ? (
                      // Regular ingredient
                      <div className="flex flex-col w-full">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={ingredient.text}
                            onChange={(e) =>
                              handleIngredientChange(index, e.target.value)
                            }
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ingredient"
                          />
                          {/* Button to convert to section */}
                          <button
                            type="button"
                            onClick={() => {
                              const newIngredients = [...ingredients];
                              newIngredients[index] = {
                                sectionTitle: ingredient.text || "New Section",
                                ingredients: [{ text: "" }],
                              };
                              setIngredients(newIngredients);
                              setHasIngredientSections(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            Make Section
                          </button>
                        </div>
                        <div className="flex items-center mt-1 ml-1">
                          <input
                            type="checkbox"
                            id={`ingredient-optional-${index}`}
                            checked={ingredient.optional || false}
                            onChange={(e) => {
                              const newIngredients = [...ingredients];
                              (
                                newIngredients[index] as IngredientItem
                              ).optional = e.target.checked;
                              setIngredients(newIngredients);
                            }}
                            className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`ingredient-optional-${index}`}
                            className="text-sm text-gray-600"
                          >
                            Optional ingredient
                          </label>
                        </div>
                      </div>
                    ) : (
                      // Section
                      <div className="w-full border border-gray-200 rounded-md p-3 mb-2">
                        <input
                          type="text"
                          value={ingredient.sectionTitle}
                          onChange={(e) => {
                            const newIngredients = [...ingredients];
                            (
                              newIngredients[index] as IngredientSection
                            ).sectionTitle = e.target.value;
                            setIngredients(newIngredients);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                          placeholder="Section Title"
                        />

                        {/* Sub-ingredients */}
                        {ingredient.ingredients.map(
                          (subIngredient, subIndex) => (
                            <div
                              key={subIndex}
                              className="flex flex-col gap-1 mb-2 pl-4"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={
                                    "text" in subIngredient
                                      ? subIngredient.text
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const newIngredients = [...ingredients];
                                    const section = newIngredients[
                                      index
                                    ] as IngredientSection;
                                    if (
                                      "text" in section.ingredients[subIndex]
                                    ) {
                                      (
                                        section.ingredients[
                                          subIndex
                                        ] as IngredientItem
                                      ).text = e.target.value;
                                    }
                                    setIngredients(newIngredients);
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Ingredient"
                                />

                                {/* Remove sub-ingredient button */}
                                {ingredient.ingredients.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newIngredients = [...ingredients];
                                      const section = newIngredients[
                                        index
                                      ] as IngredientSection;
                                      section.ingredients =
                                        section.ingredients.filter(
                                          (_, i) => i !== subIndex
                                        );
                                      setIngredients(newIngredients);
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <span className="sr-only">Remove</span>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>

                              {/* Optional checkbox for sub-ingredients */}
                              {"text" in subIngredient && (
                                <div className="flex items-center ml-1">
                                  <input
                                    type="checkbox"
                                    id={`sub-ingredient-optional-${index}-${subIndex}`}
                                    checked={subIngredient.optional || false}
                                    onChange={(e) => {
                                      const newIngredients = [...ingredients];
                                      const section = newIngredients[
                                        index
                                      ] as IngredientSection;
                                      if (
                                        "text" in section.ingredients[subIndex]
                                      ) {
                                        (
                                          section.ingredients[
                                            subIndex
                                          ] as IngredientItem
                                        ).optional = e.target.checked;
                                      }
                                      setIngredients(newIngredients);
                                    }}
                                    className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                  />
                                  <label
                                    htmlFor={`sub-ingredient-optional-${index}-${subIndex}`}
                                    className="text-sm text-gray-600"
                                  >
                                    Optional ingredient
                                  </label>
                                </div>
                              )}
                            </div>
                          )
                        )}

                        {/* Add sub-ingredient button */}
                        <button
                          type="button"
                          onClick={() => {
                            const newIngredients = [...ingredients];
                            const section = newIngredients[
                              index
                            ] as IngredientSection;
                            section.ingredients.push({ text: "" });
                            setIngredients(newIngredients);
                          }}
                          className="ml-4 text-indigo-600 hover:text-indigo-800"
                        >
                          + Add Ingredient to Section
                        </button>
                      </div>
                    )}

                    {/* Remove ingredient button */}
                    {ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <span className="sr-only">Remove</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-gray-700 font-semibold">
                    Instructions
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
                  <div key={index} className="mb-2">
                    <div className="flex gap-2 items-start">
                      <span className="bg-gray-200 rounded-full w-6 h-6 flex items-center justify-center text-gray-700 font-medium flex-shrink-0 mt-2">
                        {index + 1}
                      </span>
                      <textarea
                        value={instruction.text}
                        onChange={(e) =>
                          handleInstructionChange(index, e.target.value)
                        }
                        rows={2}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Step ${index + 1}`}
                      />
                      {instructions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveInstruction(index)}
                          className="text-red-500 hover:text-red-700 mt-2"
                        >
                          <span className="sr-only">Remove</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
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
