import DOMPurify from "dompurify";
import parse, { Element, HTMLReactParserOptions } from "html-react-parser";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { recipeAPI } from "../../../src/services/api";

interface Recipe {
  _id: string;
  title: string;
  fullRecipe?: string;
  sourceUrl?: string;
}

export default function FullRecipe() {
  const router = useRouter();
  const { id } = router.query;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await recipeAPI.getRecipeById(id as string);
        setRecipe(data);

        // If no full recipe text is available, show an error
        if (!data.fullRecipe) {
          setError("No full recipe text available for this recipe.");
        }
      } catch (err) {
        console.error("Failed to fetch recipe:", err);
        setError("Failed to load recipe details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  // Function to convert and sanitize HTML content
  const formatFullRecipe = (content: string) => {
    // Check if content looks like HTML
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);

    if (hasHtmlTags) {
      // Sanitize HTML to prevent XSS
      const sanitized =
        typeof window !== "undefined"
          ? DOMPurify.sanitize(content, {
              ADD_TAGS: ["img"],
              ADD_ATTR: ["src", "alt", "width", "height"],
            })
          : content;

      // Parse options for customizing element rendering
      const options: HTMLReactParserOptions = {
        replace: (domNode) => {
          if (domNode instanceof Element && domNode.name === "img") {
            // Ensure images have appropriate styling
            const props = {
              ...domNode.attribs,
              loading: "lazy" as const,
              className: "recipe-image",
              alt: domNode.attribs.alt || "Recipe image",
            };
            return <img {...props} />;
          }
          return undefined;
        },
      };

      // Parse HTML to React elements
      return (
        <div className="recipe-html-content">{parse(sanitized, options)}</div>
      );
    } else {
      // Simple text formatting for non-HTML content
      return (
        <div className="whitespace-pre-line font-sans text-gray-800 text-base leading-relaxed">
          {content}
        </div>
      );
    }
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
        <Link
          href={id ? `/recipes/${id}` : "/recipes"}
          className="text-blue-500 hover:underline font-medium"
        >
          ← Back to Recipe
        </Link>
        <div className="text-center text-red-500 my-12">
          {error || "Recipe not found"}
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Full Recipe: {recipe.title} | Simple Recipes</title>
      </Head>

      <div className="container max-w-4xl mx-auto my-8 px-4">
        <Link
          href={`/recipes/${recipe._id}`}
          className="inline-block mb-6 text-blue-500 hover:underline font-medium"
        >
          ← Back to Recipe
        </Link>

        <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Full Recipe: {recipe.title}
          </h1>

          {recipe.sourceUrl && (
            <div className="mb-6">
              <p className="text-gray-600">
                Original source:{" "}
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {recipe.sourceUrl}
                </a>
              </p>
            </div>
          )}

          {recipe.fullRecipe ? (
            <div className="prose max-w-none recipe-content">
              {/* Display the full recipe content with HTML parsing */}
              {formatFullRecipe(recipe.fullRecipe)}
            </div>
          ) : (
            <p className="text-gray-600">
              No full recipe text available for this recipe.
            </p>
          )}
        </div>
      </div>

      {/* Add CSS for recipe content */}
      <style jsx global>{`
        .recipe-content img,
        .recipe-image {
          max-width: 100%;
          height: auto;
          margin: 1.5rem 0;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
          display: block;
        }

        .recipe-content p {
          margin-bottom: 1rem;
          line-height: 1.7;
        }

        .recipe-html-content p {
          margin-bottom: 1rem;
          line-height: 1.7;
        }

        .recipe-content h2,
        .recipe-content h3,
        .recipe-html-content h2,
        .recipe-html-content h3 {
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          font-weight: 600;
        }

        .recipe-content h2,
        .recipe-html-content h2 {
          font-size: 1.5rem;
        }

        .recipe-content h3,
        .recipe-html-content h3 {
          font-size: 1.25rem;
        }

        .recipe-html-content ul,
        .recipe-html-content ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }

        .recipe-html-content li {
          margin-bottom: 0.5rem;
        }

        @media (max-width: 640px) {
          .recipe-content img,
          .recipe-image {
            margin: 1rem 0;
          }
        }
      `}</style>
    </>
  );
}
