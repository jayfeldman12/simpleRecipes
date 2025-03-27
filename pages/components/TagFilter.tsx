import React from "react";
import { Tag } from "../../src/types/recipe";
import TagBadge from "./TagBadge";

interface TagFilterProps {
  tags: Tag[];
  selectedTags: string[];
  onTagSelect: (tagId: string) => void;
  className?: string;
  recipeCounts?: Record<string, number>;
  showCounts?: boolean;
}

const TagFilter: React.FC<TagFilterProps> = ({
  tags,
  selectedTags,
  onTagSelect,
  className = "",
  recipeCounts = {},
  showCounts = true,
}) => {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <div className="mb-2 text-sm text-gray-600 font-medium">
        Filter by tags:
      </div>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <div key={tag._id} className="flex items-center">
            <TagBadge
              tag={tag}
              size="small"
              selected={selectedTags.includes(tag._id)}
              onClick={() => onTagSelect(tag._id)}
            />
            {showCounts && recipeCounts[tag._id] !== undefined && (
              <span className="ml-1 text-xs text-gray-500">
                ({recipeCounts[tag._id]})
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TagFilter;
