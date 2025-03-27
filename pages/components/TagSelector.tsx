import React, { useEffect, useMemo, useState } from "react";
import { Tag } from "../../src/types/recipe";
import TagBadge from "./TagBadge";

interface TagSelectorProps {
  availableTags?: Tag[];
  selectedTags?: Tag[];
  onChange: (selected: Tag[]) => void;
  maxDisplay?: number;
  className?: string;
  recipeCounts?: Record<string, number>;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  availableTags = [],
  selectedTags = [],
  onChange,
  maxDisplay = 10,
  className = "",
  recipeCounts = {},
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Sort tags by popularity initially
  const initialSortedTags = useMemo(() => {
    try {
      // Make sure availableTags is iterable
      if (!Array.isArray(availableTags)) {
        return [];
      }

      return [...availableTags].sort((a, b) => {
        const countA = recipeCounts[a?._id] || 0;
        const countB = recipeCounts[b?._id] || 0;
        return countB - countA; // Descending order
      });
    } catch (error) {
      console.error("Error sorting tags:", error);
      return [];
    }
  }, [availableTags, recipeCounts]);

  const [filteredTags, setFilteredTags] = useState<Tag[]>(initialSortedTags);

  // Update filteredTags when availableTags or recipeCounts change
  useEffect(() => {
    try {
      // Make sure availableTags is iterable
      if (!Array.isArray(availableTags)) {
        setFilteredTags([]);
        return;
      }

      // Re-sort when availableTags or recipeCounts change
      const sorted = [...availableTags].sort((a, b) => {
        const countA = recipeCounts[a?._id] || 0;
        const countB = recipeCounts[b?._id] || 0;
        return countB - countA; // Descending order
      });

      // Apply search filter if there is a search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const filtered = sorted.filter((tag) =>
          tag?.name?.toLowerCase().includes(term)
        );
        setFilteredTags(filtered);
      } else {
        setFilteredTags(sorted);
      }
    } catch (error) {
      console.error("Error filtering tags:", error);
      setFilteredTags([]);
    }
  }, [availableTags, recipeCounts, searchTerm]);

  // Check if a tag is selected
  const isTagSelected = (tag: Tag) => {
    if (!Array.isArray(selectedTags)) {
      return false;
    }
    return selectedTags.some((t) => t?._id === tag?._id);
  };

  // Toggle tag selection
  const toggleTag = (tag: Tag | string) => {
    if (typeof tag === "string") {
      return; // We only handle Tag objects
    }

    if (!Array.isArray(selectedTags)) {
      onChange([tag]);
      return;
    }

    const isSelected = isTagSelected(tag);
    if (isSelected) {
      // Remove tag
      onChange(selectedTags.filter((t) => t?._id !== tag?._id));
    } else {
      // Add tag
      onChange([...selectedTags, tag]);
    }
  };

  // Determine which tags to display
  const displayTags = isExpanded
    ? filteredTags
    : filteredTags.slice(0, maxDisplay);

  const hasMoreTags = filteredTags.length > maxDisplay;

  return (
    <div className={`${className}`}>
      {/* Search input */}
      <div className="mb-2 relative">
        <input
          type="text"
          placeholder="Search tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchTerm && (
          <button
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => setSearchTerm("")}
          >
            ×
          </button>
        )}
      </div>

      {/* Selected tags section */}
      {Array.isArray(selectedTags) && selectedTags.length > 0 && (
        <div className="mb-3">
          <div className="text-sm font-medium text-gray-700 mb-1">
            Selected:
          </div>
          <div className="flex flex-wrap gap-y-2">
            {selectedTags.map((tag) => (
              <TagBadge
                key={tag?._id || Math.random().toString()}
                tag={tag}
                selected={true}
                onClick={toggleTag}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available tags */}
      <div className="flex flex-wrap gap-y-2">
        {displayTags.map((tag) => (
          <TagBadge
            key={tag?._id || Math.random().toString()}
            tag={tag}
            selected={isTagSelected(tag)}
            onClick={toggleTag}
          />
        ))}

        {/* Show more button */}
        {!isExpanded && hasMoreTags && (
          <button
            className="text-xs text-blue-500 hover:text-blue-700 ml-1"
            onClick={() => setIsExpanded(true)}
          >
            +{filteredTags.length - maxDisplay} more
          </button>
        )}

        {/* Show less button */}
        {isExpanded && hasMoreTags && (
          <button
            className="text-xs text-blue-500 hover:text-blue-700 ml-1"
            onClick={() => setIsExpanded(false)}
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
};

export default TagSelector;
