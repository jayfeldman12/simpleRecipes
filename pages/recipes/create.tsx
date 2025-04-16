import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import CollapsibleSection from "../../src/components/CollapsibleSection";
import CreateManuallyForm from "../../src/components/CreateManuallyForm";
import PasteTextForm from "../../src/components/PasteTextForm";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import QuickImportForm from "../../src/components/QuickImportForm";
import UploadFileForm from "../../src/components/UploadFileForm";
import { Recipe } from "../../src/types/recipe";

const CreateRecipePage = () => {
  const router = useRouter();
  const [importedRecipe, setImportedRecipe] = useState<Partial<Recipe> | null>(
    null
  );

  // UI state for expandable sections
  const [activeSection, setActiveSection] = useState<
    "manual" | "paste" | "upload" | null
  >(null);

  const handleRecipeCreated = (recipeId: string) => {
    router.push(`/recipes/${recipeId}`);
  };

  const handleImportForEdit = (recipeData: Partial<Recipe>) => {
    setImportedRecipe(recipeData);
    setActiveSection("manual");
  };

  const toggleSection = (section: "manual" | "paste" | "upload") => {
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

          {/* Paste text section */}
          <CollapsibleSection
            title="Paste Text"
            isActive={activeSection === "paste"}
            onToggle={() => toggleSection("paste")}
          >
            <PasteTextForm
              onImportSuccess={handleRecipeCreated}
              onImportForEdit={handleImportForEdit}
            />
          </CollapsibleSection>

          {/* Upload file section */}
          <CollapsibleSection
            title="Upload File"
            isActive={activeSection === "upload"}
            onToggle={() => toggleSection("upload")}
          >
            <UploadFileForm />
          </CollapsibleSection>

          {/* Manual creation section */}
          <CollapsibleSection
            title={importedRecipe ? "Edit Imported Recipe" : "Create Manually"}
            isActive={activeSection === "manual"}
            onToggle={() => toggleSection("manual")}
          >
            <CreateManuallyForm
              initialData={importedRecipe || undefined}
              onSuccess={handleRecipeCreated}
            />
          </CollapsibleSection>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default CreateRecipePage;
