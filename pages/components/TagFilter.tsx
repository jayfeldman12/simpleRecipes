import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import React, { useEffect, useMemo, useState } from "react";
import { Tag } from "../../src/types/recipe";
import TagBadge from "./TagBadge";

interface TagFilterProps {
  tags: Tag[];
  selectedTags: string[];
  onTagSelect: (tagId: string) => void;
  className?: string;
  recipeCounts?: Record<string, number>;
  showCounts?: boolean;
  maxDisplay?: number;
}

const TagFilter: React.FC<TagFilterProps> = ({
  tags,
  selectedTags,
  onTagSelect,
  className = "",
  recipeCounts = {},
  showCounts = true,
  maxDisplay = 15,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if we're on mobile for initial collapsed state
  useEffect(() => {
    const checkMobile = () => {
      setIsCollapsed(window.innerWidth < 768);
    };

    // Set initial state
    checkMobile();

    // Add resize listener
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Sort tags by popularity (recipe count)
  const sortedTags = useMemo(() => {
    if (!tags || tags.length === 0) {
      return [] as Tag[];
    }
    return [...tags].sort((a, b) => {
      const countA = recipeCounts[a._id] || 0;
      const countB = recipeCounts[b._id] || 0;
      return countB - countA; // Descending order
    });
  }, [tags, recipeCounts]);

  // If, after sorting, there are no tags to display, render nothing.
  if (sortedTags.length === 0) {
    return null;
  }

  // Determine which tags to display
  const displayTags = isExpanded ? sortedTags : sortedTags.slice(0, maxDisplay);
  const hasMoreTags = sortedTags.length > maxDisplay;
  const selectedTagCount = selectedTags.length;

  return (
    <div className={`${className}`}>
      <div
        className="mb-2 flex justify-between items-center cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="text-sm text-gray-600 font-medium flex items-center">
          Filter by tags:
          {selectedTagCount > 0 && (
            <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
              {selectedTagCount} selected
            </span>
          )}
        </div>
        <div className="text-gray-600 md:hidden">
          {isCollapsed ? (
            <ChevronDownIcon className="h-5 w-5" />
          ) : (
            <ChevronUpIcon className="h-5 w-5" />
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="inline-block">
          {displayTags.map((tag) => (
            <span key={tag._id} className="inline-flex items-center mb-2 mr-2">
              <TagBadge
                tag={tag}
                size="small"
                selected={selectedTags.includes(tag._id)}
                onClick={() => onTagSelect(tag._id)}
                className="mr-0"
              />
              {showCounts && recipeCounts[tag._id] !== undefined && (
                <span className="ml-0.5 text-xs text-gray-500">
                  ({recipeCounts[tag._id]})
                </span>
              )}
            </span>
          ))}

          {/* Show more/less buttons */}
          {hasMoreTags && (
            <button
              className="text-xs font-medium text-blue-500 hover:text-blue-700 mb-2"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                "Show less"
              ) : (
                <>+{sortedTags.length - maxDisplay} more</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TagFilter;
