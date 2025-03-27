import React from "react";
import { Tag } from "../../src/types/recipe";

interface TagBadgeProps {
  tag: Tag | string;
  size?: "small" | "medium" | "large";
  onClick?: (tag: Tag | string) => void;
  selected?: boolean;
  className?: string;
}

const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  size = "medium",
  onClick,
  selected = false,
  className = "",
}) => {
  // Determine the tag name
  const tagName = typeof tag === "string" ? tag : tag.name;

  // Size-based classes
  const sizeClasses = {
    small: "text-xs px-2 py-0.5",
    medium: "text-sm px-2.5 py-0.5",
    large: "text-base px-3 py-1",
  };

  // Style based on selection state
  const selectedClass = selected
    ? "bg-blue-500 text-white"
    : "bg-gray-100 text-gray-700 hover:bg-gray-200";

  const handleClick = () => {
    if (onClick) {
      onClick(tag);
    }
  };

  return (
    <span
      className={`${
        sizeClasses[size]
      } ${selectedClass} rounded-full font-medium mr-1.5 mb-1.5 inline-block transition-colors ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      onClick={onClick ? handleClick : undefined}
    >
      {tagName}
    </span>
  );
};

export default TagBadge;
