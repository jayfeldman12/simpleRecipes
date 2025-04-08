import { ReactNode } from "react";

type CollapsibleSectionProps = {
  title: string;
  isActive: boolean;
  onToggle: () => void;
  children: ReactNode;
};

const CollapsibleSection = ({
  title,
  isActive,
  onToggle,
  children,
}: CollapsibleSectionProps) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={onToggle}
      >
        <h2 className="text-xl font-semibold">{title}</h2>
        <button
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            isActive
              ? "bg-indigo-100 text-indigo-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {isActive ? "Hide" : "Show"}
        </button>
      </div>

      {isActive && <div className="mt-6">{children}</div>}
    </div>
  );
};

export default CollapsibleSection;
