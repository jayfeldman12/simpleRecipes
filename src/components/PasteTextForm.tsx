import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import { useState } from "react";
import { recipeAPI } from "../services/api";
import { Recipe } from "../types/recipe";

type PasteTextFormProps = {
  onImportSuccess?: (recipeId: string) => void;
  onImportForEdit?: (recipeData: Partial<Recipe>) => void;
};

const PasteTextForm = ({
  onImportSuccess,
  onImportForEdit,
}: PasteTextFormProps) => {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    setError(null);
    setStatus(null);

    // Validate content
    if (!content.trim()) {
      setError("Please enter some text or HTML");
      return;
    }

    try {
      setProcessing(true);
      setStatus("Processing content...");

      const result = await recipeAPI.importRecipeFromText(content);

      if (result && result.recipe) {
        if (result.recipeId) {
          setStatus(
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
          setStatus(
            "Recipe imported successfully! You can make additional edits below."
          );

          if (onImportForEdit) {
            onImportForEdit(result.recipe);
          }
        }

        setContent("");
      } else {
        setError(
          "Could not import recipe. Please check your content and try again."
        );
      }
    } catch (err: unknown) {
      console.error("Error importing recipe:", err);
      const error = err as { status?: number; message?: string };
      if (error.status === 400) {
        setError(
          "Failed to extract recipe data from the provided content. Please make sure it contains a valid recipe."
        );
      } else if (error.status === 401) {
        setError("You need to be logged in to import recipes.");
      } else if (error.status === 500) {
        setError("Server error. Please try again later.");
      } else {
        setError(error.message || "Failed to import recipe. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      {status && !error && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          <div dangerouslySetInnerHTML={{ __html: status }} />
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label
          htmlFor="recipe-content"
          className="block text-gray-700 font-medium mb-2"
        >
          Paste recipe text or HTML below
        </label>
        <textarea
          id="recipe-content"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setError(null);
          }}
          rows={10}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Paste recipe content here..."
          disabled={processing}
        />
      </div>

      <button
        type="button"
        onClick={handleProcess}
        className="w-full sm:w-auto mt-2 sm:mt-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-center sm:whitespace-nowrap"
        disabled={processing}
      >
        {processing ? (
          <>
            <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
            Processing...
          </>
        ) : (
          "Import Recipe"
        )}
      </button>
      <p className="text-sm text-gray-500 mt-1">
        We'll extract recipe details from your pasted content
      </p>
    </div>
  );
};

export default PasteTextForm;
