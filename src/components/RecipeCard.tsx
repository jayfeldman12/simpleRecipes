import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

interface RecipeCardProps {
  recipe: {
    _id: string;
    title: string;
    description: string;
    cookingTime?: number;
    imageUrl: string;
    user: {
      _id: string;
      username: string;
    };
  };
  isEditable?: boolean;
  onDelete?: (recipeId: string) => void;
}

const RecipeCard = ({
  recipe,
  isEditable = false,
  onDelete,
}: RecipeCardProps) => {
  const router = useRouter();
  const currentPath = router.pathname;

  // Determine if the imageUrl is an absolute URL or a relative path
  const isAbsoluteUrl =
    recipe.imageUrl &&
    (recipe.imageUrl.startsWith("http://") ||
      recipe.imageUrl.startsWith("https://"));

  // Set the image source based on whether it's an absolute URL or a relative path
  const imgSrc = isAbsoluteUrl
    ? recipe.imageUrl
    : recipe.imageUrl
    ? `/images/${recipe.imageUrl}`
    : "/images/default-recipe.jpg";

  // Get the from parameter based on the current page
  const from =
    currentPath === "/recipes/my-recipes" ? "/recipes/my-recipes" : "/recipes";

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <Link
        href={`/recipes/${recipe._id}?from=${encodeURIComponent(from)}`}
        className="block"
      >
        <div className="relative h-48">
          <Image
            src={imgSrc}
            alt={recipe.title}
            fill
            style={{ objectFit: "cover" }}
          />
          {recipe.cookingTime && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {recipe.cookingTime} min
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {recipe.title}
          </h3>
          <p className="text-gray-600 text-sm line-clamp-2">
            {recipe.description}
          </p>
        </div>
      </Link>

      {isEditable && (
        <div className="px-4 pb-4 flex justify-end space-x-2">
          <Link
            href={`/recipes/edit/${recipe._id}`}
            className="text-gray-600 hover:text-gray-800"
          >
            <span className="sr-only">Edit</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(recipe._id)}
              className="text-red-500 hover:text-red-700"
            >
              <span className="sr-only">Delete</span>
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
          )}
        </div>
      )}
    </div>
  );
};

export default RecipeCard;
