import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import { useState } from "react";
import { recipeAPI } from "../services/api";
import { Recipe } from "../types/recipe";
import AuthErrorBanner from "./AuthErrorBanner";

type QuickImportFormProps = {
  onImportSuccess?: (recipeId: string) => void;
  onImportForEdit?: (recipeData: Partial<Recipe>) => void;
};

const QuickImportForm = ({
  onImportSuccess,
  onImportForEdit,
}: QuickImportFormProps) => {
  const router = useRouter();

  // URL import states
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        if (result.recipeId) {
          setImportStatus(
            "Recipe imported successfully! Redirecting to recipe page..."
          );

          setTimeout(() => {
            if (onImportSuccess && result.recipeId) {
              onImportSuccess(result.recipeId);
            } else if (result.recipeId) {
              router.push(`/recipes/${result.recipeId}`);
            }
          }, 1000);
        } else {
          setImportStatus(
            "Recipe imported successfully! You can make additional edits below."
          );

          if (onImportForEdit) {
            onImportForEdit(result.recipe);
          }
        }

        setUrl("");
      } else {
        setError(
          "Could not import recipe. Please check the URL and try again."
        );
      }
    } catch (err: unknown) {
      console.error("Error importing recipe:", err);
      const error = err as { status?: number; message?: string };
      if (error.status === 400) {
        setError(
          "Failed to extract recipe data from the provided URL. Please make sure it's a valid recipe page."
        );
      } else if (error.status === 401) {
        setError("You need to be logged in to import recipes.");
      } else if (error.status === 500) {
        setError(
          "Server error. Please try again later or try a different URL."
        );
      } else {
        setError(
          error.message ||
            "Failed to import recipe. Please try a different URL."
        );
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Quick Import</h2>
      <p className="mb-4">
        Have a recipe from another website? Import it automatically by providing
        the URL.
      </p>

      {importStatus && !error && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          <div dangerouslySetInnerHTML={{ __html: importStatus }} />
        </div>
      )}

      {error && <AuthErrorBanner error={error} className="mb-6" />}

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
              <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
              Importing...
            </>
          ) : (
            "Import Recipe"
          )}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-1">
        Paste a URL to a recipe page and we'll automatically extract the recipe
        details
      </p>
    </div>
  );
};

export default QuickImportForm;
