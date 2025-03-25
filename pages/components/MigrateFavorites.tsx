import { useState } from "react";
import { useAuth } from "../../src/context/AuthContext";

const MigrateFavorites = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    message?: string;
    totalLegacyFavorites?: number;
    totalExistingFavorites?: number;
    migratedCount?: number;
    error?: string;
  } | null>(null);

  const handleMigrate = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setResult(null);

      const response = await fetch("/api/recipes/migrate-favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          message: data.message,
          totalLegacyFavorites: data.totalLegacyFavorites,
          totalExistingFavorites: data.totalExistingFavorites,
          migratedCount: data.migratedCount,
        });

        // Refresh the page to see updated favorites
        if (data.migratedCount > 0) {
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else {
        setResult({ error: data.message || "Failed to migrate favorites" });
      }
    } catch (err) {
      console.error("Error migrating favorites:", err);
      setResult({ error: "Failed to migrate favorites" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-2">Migrate Favorites</h2>
      <p className="text-sm text-gray-600 mb-4">
        If you're having issues with favorites, use this to migrate your
        favorites from the old system to the new one.
      </p>

      <button
        onClick={handleMigrate}
        disabled={loading}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-300"
      >
        {loading ? "Migrating..." : "Migrate Favorites"}
      </button>

      {result && (
        <div className="mt-4">
          {result.error ? (
            <div className="text-red-600">{result.error}</div>
          ) : (
            <div className="text-green-600">
              <p>{result.message}</p>
              <p className="text-sm mt-1">
                Legacy favorites: {result.totalLegacyFavorites || 0}
                <br />
                Existing favorites: {result.totalExistingFavorites || 0}
                <br />
                Newly migrated: {result.migratedCount || 0}
              </p>
              {result.migratedCount && result.migratedCount > 0 && (
                <p className="text-sm mt-2">Page will refresh soon...</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MigrateFavorites;
