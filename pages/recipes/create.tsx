import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import CreateManuallyForm from "../../src/components/CreateManuallyForm";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import QuickImportForm from "../../src/components/QuickImportForm";
import { Recipe } from "../../src/types/recipe";

const CreateRecipePage = () => {
  const router = useRouter();
  const [importedRecipe, setImportedRecipe] = useState<Partial<Recipe> | null>(
    null
  );

  // UI state for expandable sections
  const [activeSection, setActiveSection] = useState<"manual" | null>(null);

  const handleRecipeCreated = (recipeId: string) => {
    router.push(`/recipes/${recipeId}`);
  };

  const handleImportForEdit = (recipeData: Partial<Recipe>) => {
    setImportedRecipe(recipeData);
    setActiveSection("manual");
  };

  const toggleSection = (section: "manual") => {
    if (activeSection === section) {
      setActiveSection(null);
    } else {
      setActiveSection(section);
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
            <QuickImportForm
              onImportSuccess={handleRecipeCreated}
              onImportForEdit={handleImportForEdit}
            />
          </div>

          {/* Manual creation section */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleSection("manual")}
            >
              <h2 className="text-xl font-semibold">
                {importedRecipe ? "Edit Imported Recipe" : "Create Manually"}
              </h2>
              <button
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeSection === "manual"
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {activeSection === "manual" ? "Hide" : "Show"}
              </button>
            </div>

            {activeSection === "manual" && (
              <div className="mt-6">
                <CreateManuallyForm
                  initialData={importedRecipe || undefined}
                  onSuccess={handleRecipeCreated}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default CreateRecipePage;
