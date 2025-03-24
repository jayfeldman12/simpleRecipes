// Define components for proper imports
declare module "../components/ProtectedRoute" {
  interface ProtectedRouteProps {
    children: React.ReactNode;
  }
  const ProtectedRoute: React.FC<ProtectedRouteProps>;
  export default ProtectedRoute;
}

declare module "../components/SearchBar" {
  interface SearchBarProps {
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }
  const SearchBar: React.FC<SearchBarProps>;
  export default SearchBar;
}

declare module "../pages/components/RecipeCard" {
  interface RecipeCardProps {
    recipe: {
      _id?: string;
      title?: string;
      description?: string;
      imageUrl?: string;
      cookingTime?: number;
      createdBy?: string;
      isFavorite?: boolean;
      sourceUrl?: string;
    };
    isDraggable?: boolean;
    from?: string;
    isEditable?: boolean;
    onDelete?: (id: string) => void;
    onFavoriteChange?: (id: string, isFavorite: boolean) => void;
  }
  const RecipeCard: React.FC<RecipeCardProps>;
  export default RecipeCard;
}

// Define components from different paths
declare module "../../components/ProtectedRoute" {
  const ProtectedRoute: React.FC<{ children: React.ReactNode }>;
  export default ProtectedRoute;
}

declare module "../../components/SearchBar" {
  interface SearchBarProps {
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }
  const SearchBar: React.FC<SearchBarProps>;
  export default SearchBar;
}

declare module "../../components/RecipeCard" {
  interface RecipeCardProps {
    recipe: {
      _id?: string;
      title?: string;
      description?: string;
      imageUrl?: string;
      cookingTime?: number;
      createdBy?: string;
      isFavorite?: boolean;
      sourceUrl?: string;
    };
    isDraggable?: boolean;
    from?: string;
    isEditable?: boolean;
    onDelete?: (id: string) => void;
    onFavoriteChange?: (id: string, isFavorite: boolean) => void;
  }
  const RecipeCard: React.FC<RecipeCardProps>;
  export default RecipeCard;
}

declare module "../../hooks/useDebounce" {
  function useDebounce<T>(value: T, delay: number): T;
  export default useDebounce;
}
