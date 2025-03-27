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
          <svg
            className="w-4 h-4 text-gray-500"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
            />
          </svg>
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
            <svg
              className="w-4 h-4 text-gray-500 hover:text-gray-900"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

// Add display name for React DevTools
SearchBar.displayName = "SearchBar";

export default SearchBar;
