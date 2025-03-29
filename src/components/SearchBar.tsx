import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  ForwardedRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  debounceTime?: number;
  initialValue?: string;
}

export interface SearchBarHandle {
  clear: () => void;
}

/**
 * Reusable search bar component with debounce functionality
 */
const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(
  (
    {
      onSearch,
      placeholder = "Search recipes...",
      className = "",
      debounceTime = 300,
      initialValue = "",
    }: SearchBarProps,
    ref: ForwardedRef<SearchBarHandle>
  ) => {
    const [searchTerm, setSearchTerm] = useState(initialValue);

    // Expose clear method to parent components via ref
    useImperativeHandle(ref, () => ({
      clear: () => {
        setSearchTerm("");
        onSearch("");
      },
    }));

    // Use debounce to prevent excessive searches while typing
    useEffect(() => {
      const timer = setTimeout(() => {
        onSearch(searchTerm);
      }, debounceTime);

      return () => clearTimeout(timer);
    }, [searchTerm, onSearch, debounceTime]);

    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <MagnifyingGlassIcon
            className="w-4 h-4 text-gray-500"
            aria-hidden="true"
          />
        </div>
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500"
          placeholder={placeholder}
        />
        {searchTerm && (
          <button
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            onClick={() => {
              setSearchTerm("");
              onSearch("");
            }}
            aria-label="Clear search"
          >
            <XMarkIcon className="w-4 h-4 text-gray-500 hover:text-gray-900" />
          </button>
        )}
      </div>
    );
  }
);

// Add display name for React DevTools
SearchBar.displayName = "SearchBar";

export default SearchBar;
