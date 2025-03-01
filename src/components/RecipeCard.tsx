import Link from "next/link";

interface RecipeCardProps {
  recipe: {
    _id: string;
    title: string;
    description: string;
    cookingTime: number;
    imageUrl: string;
    tags: string[];
    user: {
      _id: string;
      username: string;
    };
  };
}

const RecipeCard = ({ recipe }: RecipeCardProps) => {
  return (
    <div className="group relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="w-full h-48 bg-gray-200 relative">
        {recipe.imageUrl ? (
          <img
            src={`/images/${recipe.imageUrl}`}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        <Link href={`/recipes/${recipe._id}`}>
          <h3 className="text-lg font-medium text-gray-900 hover:text-indigo-600 transition-colors">
            {recipe.title}
          </h3>
        </Link>
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
          {recipe.description}
        </p>
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <svg
            className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
          <span>{recipe.cookingTime} min</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {recipe.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center text-sm">
          <span className="text-gray-500">By {recipe.user.username}</span>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
