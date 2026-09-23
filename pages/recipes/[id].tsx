import {
  ArrowLeftIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ClockIcon,
  HeartIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAuth } from "../../src/context/AuthContext";
import { recipeAPI } from "../../src/services/api";
import { IngredientItem, IngredientType, Recipe } from "../../src/types/recipe";
import RecipeModel from "../api/models/Recipe";
import dbConnect from "../api/utils/dbConnect";
import { favoritesUpdated } from "../components/RecipeCard";
import TagBadge from "../components/TagBadge";

// Recipes without a real photo store this sentinel instead of a usable URL
const PLACEHOLDER_IMAGE = "default-recipe.jpg";

// Rendered server-side so link unfurlers - which do not run JS - can read the
// recipe's title, description and hero image.
interface RecipeMeta {
  title: string;
  description: string;
  imageUrl: string | null;
  url: string;
}

interface RecipeDetailProps {
  meta: RecipeMeta | null;
}

// Helper component to recursively render ingredients
const RenderIngredients = ({
  ingredients,
}: {
  ingredients: Array<IngredientType>;
}) => {
  // Helper function to render optional ingredients with appropriate formatting
  const renderIngredientText = (item: IngredientItem) => {
    // Check if already contains the word "optional" in the text
    const containsOptional = item.text.toLowerCase().includes("optional");

    if (item.optional && !containsOptional) {
      return (
        <span>
          <span className="italic text-gray-500">Optional: </span>
          {item.text}
        </span>
      );
    } else {
      return item.text;
    }
  };

  return (
    <ul className="space-y-3">
      {ingredients.map((item, index) => {
        // Check if this is a section or a regular ingredient
        if ("sectionTitle" in item) {
          // This is a section
          return (
            <li key={index} className="mt-4 first:mt-0">
              <h3 className="font-bold text-gray-800 mb-2 text-lg">
                {item.sectionTitle}
              </h3>
              <RenderIngredients ingredients={item.ingredients} />
            </li>
          );
        } else {
          // This is a regular ingredient
          return (
            <li key={index} className="text-gray-700 text-lg">
              {renderIngredientText(item)}
            </li>
          );
        }
      })}
    </ul>
  );
};

export default function RecipeDetail({ meta }: RecipeDetailProps) {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [previousPage, setPreviousPage] = useState("/recipes");
  const [expandedSection, setExpandedSection] = useState<
    "ingredients" | "instructions" | null
  >(null);
  const [imageError, setImageError] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">(
    "idle"
  );

  // Generate a consistent color based on recipe title
  const getGradientColors = (title: string) => {
    // Create a simple hash from the title
    const hash = title.split("").reduce((hash, char) => {
      return char.charCodeAt(0) + ((hash << 5) - hash);
    }, 0);

    // Use the hash to determine a hue value (0-360)
    const hue = Math.abs(hash % 360);

    // Return a gradient using this hue
    return `linear-gradient(135deg, hsl(${hue}, 70%, 60%) 0%, hsl(${
      (hue + 40) % 360
    }, 70%, 45%) 100%)`;
  };

  useEffect(() => {
    // router.query is empty on the first render of a dynamic route
    if (!router.isReady) return;

    const from = router.query.from;
    if (typeof from !== "string" || !from) return;

    // Only trust internal paths - "//host" or an absolute URL would turn the
    // back link into an open redirect.
    if (from.startsWith("/") && !from.startsWith("//")) {
      setPreviousPage(from);
    }

    // Hold the origin page in local state and drop it from the URL, so the
    // address bar - and anything shared from it - stays clean.
    const { from: _from, ...query } = router.query;
    router.replace({ pathname: router.pathname, query }, undefined, {
      shallow: true,
    });
  }, [router.isReady, router.query.from]);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await recipeAPI.getRecipeById(id as string);
        setRecipe(data);
        setIsFavorite(data.isFavorite || false);
        setImageError(!data.imageUrl);
      } catch (err) {
        console.error("Failed to fetch recipe:", err);
        setError("Failed to load recipe details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  const handleFavoriteToggle = async () => {
    if (!user || !recipe) return;

    try {
      // Optimistically update UI before API call completes
      const newFavoriteStatus = !isFavorite;
      setIsFavorite(newFavoriteStatus);

      // Dispatch global event to update other instances of this recipe
      const event = new CustomEvent("favoritesChanged", {
        detail: {
          recipeId: recipe._id,
          isFavorite: newFavoriteStatus,
        },
      });
      favoritesUpdated.dispatchEvent(event);

      // Now make the actual API call
      if (newFavoriteStatus) {
        await recipeAPI.addToFavorites(recipe._id as string);
      } else {
        await recipeAPI.removeFromFavorites(recipe._id as string);
      }
    } catch (err) {
      // If API call fails, revert the optimistic update
      console.error("Failed to update favorite status:", err);
      setIsFavorite(!isFavorite); // Restore previous state

      // Dispatch event to update other components with the reverted state
      const revertEvent = new CustomEvent("favoritesChanged", {
        detail: {
          recipeId: recipe._id,
          isFavorite: !isFavorite, // The original state
        },
      });
      favoritesUpdated.dispatchEvent(revertEvent);
    }
  };

  // Listen for favorite changes from other components
  useEffect(() => {
    const handleFavoritesChange = (e: Event) => {
      if (e instanceof CustomEvent && e.detail && recipe) {
        const { recipeId, isFavorite: newStatus } = e.detail;
        if (recipe._id === recipeId) {
          setIsFavorite(newStatus);
        }
      }
    };

    favoritesUpdated.addEventListener(
      "favoritesChanged",
      handleFavoritesChange
    );

    return () => {
      favoritesUpdated.removeEventListener(
        "favoritesChanged",
        handleFavoritesChange
      );
    };
  }, [recipe]);

  const handleDelete = async () => {
    if (!recipe) return;

    if (window.confirm("Are you sure you want to delete this recipe?")) {
      try {
        await recipeAPI.deleteRecipe(recipe._id as string);
        router.push("/recipes/my-recipes");
      } catch (err) {
        console.error("Failed to delete recipe:", err);
        setError("Failed to delete recipe. Please try again.");
      }
    }
  };

  const handleShare = async () => {
    if (!recipe) return;

    const url = `${window.location.origin}/recipes/${recipe._id}`;

    // Native share sheet on mobile and supported desktop browsers
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: recipe.description,
          url,
        });
        return;
      } catch (err) {
        // Dismissing the share sheet is not an error worth reporting
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    // Otherwise fall back to copying the link
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
    } catch (err) {
      console.error("Failed to share recipe:", err);
      setShareStatus("error");
    }
  };

  // Return the share button to its default label after a moment
  useEffect(() => {
    if (shareStatus === "idle") return;
    const timer = setTimeout(() => setShareStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [shareStatus]);

  const toggleExpand = (section: "ingredients" | "instructions") => {
    if (expandedSection === section) {
      setExpandedSection(null); // Collapse if already expanded
    } else {
      setExpandedSection(section); // Expand the clicked section
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Prefer the server-rendered values: they are present in the very first HTML
  // response, which is all a link unfurler ever sees.
  const pageTitle = meta?.title || recipe?.title || "Recipe";
  const pageDescription = meta?.description || recipe?.description || "";

  const head = (
    <Head>
      <title>{`${pageTitle} | Simple Recipes`}</title>
      <meta name="description" content={pageDescription} />
      <meta property="og:site_name" content="Simple Recipes" />
      <meta property="og:type" content="article" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      {meta?.url && <meta property="og:url" content={meta.url} />}
      {meta?.imageUrl && <meta property="og:image" content={meta.imageUrl} />}
      {meta?.imageUrl && <meta property="og:image:alt" content={pageTitle} />}
      <meta
        name="twitter:card"
        content={meta?.imageUrl ? "summary_large_image" : "summary"}
      />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      {meta?.imageUrl && <meta name="twitter:image" content={meta.imageUrl} />}
    </Head>
  );

  if (loading) {
    return (
      <>
        {head}
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </>
    );
  }

  if (error || !recipe) {
    return (
      <>
        {head}
        <div className="container max-w-4xl mx-auto my-8 px-4">
          <Link href="/" className="text-blue-500 hover:underline font-medium">
            ← Back to Home
          </Link>
          <div className="text-center text-red-500 my-12">
            {error || "Recipe not found"}
          </div>
        </div>
      </>
    );
  }

  // Get placeholder gradient for this recipe
  const placeholderGradient = getGradientColors(recipe.title || "Recipe");
  const isOwner = !!(user && recipe.user && user._id === recipe.user._id);

  return (
    <>
      {head}

      {/* Desktop Version */}
      <div className="container max-w-6xl mx-auto my-8 px-4 md:block hidden">
        <Link
          href={previousPage}
          className="inline-block mb-6 text-blue-500 hover:underline font-medium"
        >
          ← Back to Recipes
        </Link>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {recipe.imageUrl && !imageError ? (
            <div className="h-64 sm:h-80 relative">
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
              {user && (
                <button
                  onClick={handleFavoriteToggle}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white shadow-md hover:bg-gray-100"
                >
                  <HeartIcon
                    className={`h-6 w-6 ${
                      isFavorite ? "text-red-500 fill-current" : "text-gray-400"
                    }`}
                  />
                </button>
              )}
            </div>
          ) : (
            <div className="h-64 sm:h-80 relative">
              <div
                className="w-full h-full flex items-center justify-center text-white p-6"
                style={{ background: placeholderGradient }}
              >
                <h1 className="text-3xl font-bold text-center">
                  {recipe.title}
                </h1>
              </div>
              {user && (
                <button
                  onClick={handleFavoriteToggle}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white shadow-md hover:bg-gray-100"
                >
                  <HeartIcon
                    className={`h-6 w-6 ${
                      isFavorite ? "text-red-500 fill-current" : "text-gray-400"
                    }`}
                  />
                </button>
              )}
            </div>
          )}

          <div className="p-6">
            <div className="mb-6">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-3xl font-bold text-gray-800">
                  {recipe.title}
                </h1>
                <div className="flex gap-2 items-center shrink-0">
                  <button
                    onClick={handleShare}
                    title={
                      shareStatus === "copied"
                        ? "Link copied"
                        : "Share this recipe"
                    }
                    aria-label="Share this recipe"
                    className="p-2 text-gray-600 hover:text-gray-800"
                  >
                    {shareStatus === "copied" ? (
                      <CheckIcon className="h-6 w-6 text-green-600" />
                    ) : (
                      <ShareIcon className="h-6 w-6" />
                    )}
                  </button>
                  {isOwner && (
                    <>
                      <Link
                        href={`/recipes/edit/${recipe._id}`}
                        className="p-2 text-blue-600 hover:text-blue-800"
                      >
                        <PencilIcon className="h-6 w-6" />
                      </Link>
                      <button
                        onClick={handleDelete}
                        className="p-2 text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-6 w-6" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-gray-600 mb-4">{recipe.description}</p>

              {/* Display recipe tags if available */}
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap">
                    {recipe.tags.map((tag) => (
                      <TagBadge key={tag._id} tag={tag} />
                    ))}
                  </div>
                </div>
              )}

              {/* Display metadata: cooking time, servings, source */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                {recipe.cookingTime && (
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 mr-1 text-gray-500" />
                    <span>{recipe.cookingTime} minutes</span>
                  </div>
                )}

                {recipe.servings && (
                  <div className="flex items-center">
                    <UsersIcon className="h-5 w-5 mr-1 text-gray-500" />
                    <span>{recipe.servings} servings</span>
                  </div>
                )}
              </div>

              {/* Source URL and Full Recipe links */}
              <div className="flex flex-wrap gap-4">
                {recipe.sourceUrl && (
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline flex items-center"
                  >
                    <ArrowTopRightOnSquareIcon className="h-5 w-5 mr-1" />
                    View Original Recipe
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-row gap-8">
              <div className="w-1/3">
                <div className="bg-gray-50 rounded-lg border border-gray-200 h-auto max-h-[600px] overflow-y-auto">
                  <div className="sticky top-0 bg-gray-50 z-10 p-4 pb-2 border-b border-gray-100">
                    <h2 className="text-xl font-semibold">Ingredients</h2>
                  </div>
                  <div className="px-4 pb-4">
                    <RenderIngredients ingredients={recipe.ingredients} />
                  </div>
                </div>
              </div>

              <div className="w-2/3">
                <div className="h-auto max-h-[600px] overflow-y-auto pr-4">
                  <div className="sticky top-0 bg-white z-10 pb-2 border-b border-gray-100">
                    <h2 className="text-xl font-semibold">Instructions</h2>
                  </div>
                  <ol className="space-y-6 mt-4 list-decimal pl-6">
                    {recipe.instructions.map((instruction, index) => (
                      <li
                        key={index}
                        className="text-gray-700 text-lg leading-relaxed"
                      >
                        {instruction.text}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Version - Fixed layout to prevent page scrolling */}
      <div className="md:hidden fixed inset-0 flex flex-col overflow-hidden bg-white">
        {/* Header with Back Button */}
        <div className="bg-white py-2 px-3 border-b border-gray-200 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <Link
              href={previousPage}
              className="text-blue-500 flex items-center"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-1" />
              Back
            </Link>
            {user && (
              <button onClick={handleFavoriteToggle} className="p-1">
                <HeartIcon
                  className={`h-5 w-5 ${
                    isFavorite ? "text-red-500 fill-current" : "text-gray-400"
                  }`}
                />
              </button>
            )}
          </div>
          {/* Mobile Recipe Title & Description */}
          <h1 className="text-2xl font-bold text-gray-800 mt-1">
            {recipe.title}
          </h1>
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
            {recipe.description}
          </p>
        </div>

        {/* Mobile hero image removed to optimize space */}

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Ingredients Section */}
          <div
            className={`bg-gray-50 border-b border-gray-200 transition-all duration-300 ${
              expandedSection === "ingredients"
                ? "h-full"
                : expandedSection === "instructions"
                ? "h-0 overflow-hidden"
                : "h-2/5"
            } overflow-y-auto`}
          >
            <div className="sticky top-0 bg-gray-50 z-10 py-1 px-3 border-b border-gray-100 flex justify-between items-center">
              <button
                onClick={() => toggleExpand("ingredients")}
                className="flex-1 text-left flex justify-between items-center"
                aria-label={
                  expandedSection === "ingredients"
                    ? "Collapse ingredients"
                    : "Expand ingredients"
                }
              >
                <h2 className="text-lg font-semibold">Ingredients</h2>
                <span className="p-1 text-gray-500 hover:text-gray-700">
                  {expandedSection === "ingredients" ? (
                    <ArrowsPointingInIcon className="h-5 w-5" />
                  ) : (
                    <ArrowsPointingOutIcon className="h-5 w-5" />
                  )}
                </span>
              </button>
            </div>
            <div className="p-3 pt-2">
              <RenderIngredients ingredients={recipe.ingredients} />
            </div>
          </div>

          {/* Instructions Section */}
          <div
            className={`flex-1 transition-all duration-300 ${
              expandedSection === "instructions"
                ? "h-full"
                : expandedSection === "ingredients"
                ? "h-0 overflow-hidden"
                : "h-3/5"
            } overflow-y-auto`}
          >
            <div className="sticky top-0 bg-white z-10 py-1 px-3 border-b border-gray-100 flex justify-between items-center">
              <button
                onClick={() => toggleExpand("instructions")}
                className="flex-1 text-left flex justify-between items-center"
                aria-label={
                  expandedSection === "instructions"
                    ? "Collapse instructions"
                    : "Expand instructions"
                }
              >
                <h2 className="text-lg font-semibold">Instructions</h2>
                <span className="p-1 text-gray-500 hover:text-gray-700">
                  {expandedSection === "instructions" ? (
                    <ArrowsPointingInIcon className="h-5 w-5" />
                  ) : (
                    <ArrowsPointingOutIcon className="h-5 w-5" />
                  )}
                </span>
              </button>
            </div>
            <ol className="space-y-3 p-3 pt-2">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="ml-5 list-decimal text-base">
                  <p className="text-gray-700">{instruction.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-gray-200 py-2 px-3 z-10">
          <div
            className={`grid gap-2 ${
              recipe.sourceUrl ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-100 text-blue-600 py-1 px-3 rounded-md text-center text-sm"
              >
                View Original
              </a>
            )}
            <button
              onClick={handleShare}
              aria-label="Share this recipe"
              className="bg-blue-100 text-blue-600 py-1 px-3 rounded-md text-center text-sm flex items-center justify-center gap-1"
            >
              {shareStatus === "copied" ? (
                <>
                  <CheckIcon className="h-4 w-4 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <ShareIcon className="h-4 w-4" />
                  Share
                </>
              )}
            </button>
          </div>
          {isOwner && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Link
                href={`/recipes/edit/${recipe._id}`}
                className="bg-gray-100 text-gray-600 py-1 px-3 rounded-md text-center text-sm"
              >
                Edit Recipe
              </Link>
              <button
                onClick={handleDelete}
                className="bg-red-100 text-red-600 py-1 px-3 rounded-md text-center text-sm"
              >
                Delete Recipe
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Resolve whatever is stored on the recipe into an absolute, publicly
// reachable image URL. Unfurlers reject relative paths.
const toAbsoluteImageUrl = (
  imageUrl: string | undefined,
  origin: string
): string | null => {
  if (!imageUrl || imageUrl === PLACEHOLDER_IMAGE) {
    // No photo: the page shows a generated gradient, so fall back to the
    // app icon rather than advertising an image that does not exist.
    return origin ? `${origin}/icon.png` : null;
  }

  if (/^https?:\/\//.test(imageUrl)) return imageUrl;
  if (!origin) return null;

  return `${origin}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
};

const truncate = (text: string, max = 200) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}\u2026` : text;

// The recipe body is still fetched on the client (it needs the user's token to
// resolve favourite state). This only reads the handful of fields the social
// preview needs, so they are in the HTML before any JS runs.
export const getServerSideProps: GetServerSideProps<RecipeDetailProps> = async ({
  params,
  req,
}) => {
  const id = params?.id;

  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = (
    Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || "http"
  ).split(",")[0];
  const host = req.headers.host;
  const origin = host ? `${proto}://${host}` : "";

  if (typeof id !== "string") {
    return { props: { meta: null } };
  }

  try {
    await dbConnect();

    const recipe = await RecipeModel.findById(id)
      .select("title description imageUrl")
      .lean();

    if (!recipe) {
      return { props: { meta: null } };
    }

    return {
      props: {
        meta: {
          title: recipe.title || "Recipe",
          description: truncate(recipe.description || ""),
          imageUrl: toAbsoluteImageUrl(recipe.imageUrl, origin),
          url: origin ? `${origin}/recipes/${id}` : "",
        },
      },
    };
  } catch (err) {
    // A bad id or a database hiccup should not take the page down - the
    // client-side fetch still renders the recipe (or its error state).
    console.error("Failed to load recipe metadata:", err);
    return { props: { meta: null } };
  }
};
