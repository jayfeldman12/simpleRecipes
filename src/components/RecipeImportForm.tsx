import { useRouter } from "next/router";
import { useState } from "react";
import { recipeAPI } from "../services/api";

interface RecipeImportFormProps {
  onCancel: () => void;
}

const RecipeImportForm = ({ onCancel }: RecipeImportFormProps) => {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const validateUrl = (urlString: string): boolean => {
    if (!urlString.trim()) {
      setError("Please enter a URL");
      return false;
    }

    try {
      const urlToTest = urlString.match(/^https?:\/\//)
        ? urlString
        : `https://${urlString}`;
      new URL(urlToTest);
      return true;
    } catch (err) {
      setError("Please enter a valid URL");
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setProgress(null);

    if (!validateUrl(url)) {
      return;
    }

    try {
      setLoading(true);
      setProgress("Fetching recipe page...");

      const result = await recipeAPI.importRecipeFromUrl(url);

      if (result && result.recipeId) {
        setProgress("Recipe imported successfully!");
        setTimeout(() => {
          router.push(`/recipes/${result.recipeId}`);
        }, 1000);
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
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4">Import Recipe from URL</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {progress && !error && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {progress}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="url"
          >
            Recipe URL
          </label>
          <input
            id="url"
            type="url"
            placeholder="https://example.com/recipe"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            disabled={loading}
          />
          <p className="text-sm text-gray-500 mt-1">
            Paste a URL to a recipe page and we'll automatically extract and
            save the recipe
          </p>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
            disabled={loading}
          >
            {loading ? (
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
        </div>
      </form>
    </div>
  );
};

export default RecipeImportForm;
