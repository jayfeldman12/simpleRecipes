import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Box, Container, LinearProgress, Typography } from "@mui/material";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import DragOverlay from "../../src/components/DragOverlay";
import ProtectedRoute from "../../src/components/ProtectedRoute";
import SearchBar from "../../src/components/SearchBar";
import SortableRecipeCard from "../../src/components/SortableRecipeCard";
import RecipeCard from "../components/RecipeCard";
import { Recipe } from "./interfaces";

export function FavoritesPage() {
  const { data: session, status } = useSession();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    async function fetchFavoriteRecipes() {
      if (status === "loading") return;
      if (!session) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch favorite recipes
        const recipesResponse = await fetch("/api/recipes/user/favorites");
        if (!recipesResponse.ok) {
          throw new Error(
            `Error fetching favorites: ${recipesResponse.statusText}`
          );
        }
        const recipesData = await recipesResponse.json();
        const fetchedRecipes: Recipe[] = Array.isArray(recipesData)
          ? recipesData
          : [];

        // Fetch user recipe orders
        const ordersResponse = await fetch(
          "/api/recipes/get-user-recipe-orders?recipeType=favorite"
        );
        if (!ordersResponse.ok) {
          throw new Error(
            `Error fetching recipe orders: ${ordersResponse.statusText}`
          );
        }
        const ordersData = await ordersResponse.json();
        const userRecipeOrders = ordersData.userRecipeOrders || {};

        // Assign orders to recipes
        const recipesWithOrders = fetchedRecipes.map((recipe) => ({
          ...recipe,
          userRecipeOrder: userRecipeOrders[recipe._id]?.order,
        }));

        // Sort recipes by user order, then by recipe order, then by index, and finally by creation date
        const sortedRecipes = [...recipesWithOrders].sort((a, b) => {
          // First by user recipe order (if available)
          if (
            a.userRecipeOrder !== undefined &&
            b.userRecipeOrder !== undefined
          ) {
            return a.userRecipeOrder - b.userRecipeOrder;
          }
          if (a.userRecipeOrder !== undefined) return -1;
          if (b.userRecipeOrder !== undefined) return 1;

          // Then by recipe order (if available)
          if (a.recipeOrder !== undefined && b.recipeOrder !== undefined) {
            return a.recipeOrder - b.recipeOrder;
          }
          if (a.recipeOrder !== undefined) return -1;
          if (b.recipeOrder !== undefined) return 1;

          // Then by index (if available)
          if (a.index !== undefined && b.index !== undefined) {
            return a.index - b.index;
          }
          if (a.index !== undefined) return -1;
          if (b.index !== undefined) return 1;

          // Finally by creation date (newest first)
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });

        setRecipes(sortedRecipes);
      } catch (err) {
        console.error("Error fetching favorites:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred fetching favorites"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchFavoriteRecipes();
  }, [session, status]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Find the indexes of the items
      const oldIndex = recipes.findIndex((recipe) => recipe._id === active.id);
      const newIndex = recipes.findIndex((recipe) => recipe._id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Create a new array with the updated order
      const newRecipes = [...recipes];
      const [movedRecipe] = newRecipes.splice(oldIndex, 1);
      newRecipes.splice(newIndex, 0, movedRecipe);

      // Update the userRecipeOrder values
      const updatedRecipes = newRecipes.map((recipe, index) => ({
        ...recipe,
        userRecipeOrder: index,
      }));

      // Update the state
      setRecipes(updatedRecipes);

      try {
        // Send the updated order to the server
        const updates = updatedRecipes.map((recipe, index) => ({
          recipeId: recipe._id,
          order: index,
          isFavorite: true,
          recipeType: "favorite",
        }));

        const response = await fetch("/api/recipes/update-user-recipe-orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ updates }),
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(
            `Error updating recipe order: ${response.statusText}`
          );
        }
      } catch (err) {
        console.error("Error updating recipe order:", err);
      }
    }
  };

  // Find the active recipe when dragging
  const activeRecipe = activeId
    ? recipes.find((recipe) => recipe._id === activeId)
    : null;

  const filteredRecipes = recipes.filter(
    (recipe) =>
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Favorite Recipes
      </Typography>

      {/* Search bar */}
      <Box sx={{ mb: 3 }}>
        <SearchBar
          placeholder="Search favorites..."
          initialValue={searchQuery}
          onSearch={(query: string) => setSearchQuery(query)}
        />
      </Box>

      {/* Loading indicator */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error message */}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* No favorites message */}
      {!loading && !error && filteredRecipes.length === 0 && (
        <Typography>
          {searchQuery
            ? "No favorites found matching your search."
            : "You don't have any favorite recipes yet."}
        </Typography>
      )}

      {/* Favorites list with drag-and-drop */}
      {!loading && filteredRecipes.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredRecipes.map((recipe) => recipe._id)}
            strategy={rectSortingStrategy}
          >
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1fr 1fr",
                  md: "1fr 1fr 1fr",
                },
              }}
            >
              {filteredRecipes.map((recipe) => (
                <SortableRecipeCard
                  key={recipe._id}
                  id={recipe._id}
                  recipe={{
                    _id: recipe._id,
                    title: recipe.title,
                    description: recipe.description,
                    imageUrl: recipe.imageUrl,
                    cookingTime: recipe.cookingTime,
                    isFavorite: true,
                  }}
                />
              ))}
            </Box>
          </SortableContext>

          {activeId && activeRecipe && (
            <DragOverlay>
              <RecipeCard
                recipe={{
                  _id: activeRecipe._id,
                  title: activeRecipe.title,
                  description: activeRecipe.description,
                  imageUrl: activeRecipe.imageUrl,
                  cookingTime: activeRecipe.cookingTime,
                  isFavorite: true,
                }}
              />
            </DragOverlay>
          )}
        </DndContext>
      )}
    </Container>
  );
}

export default function ProtectedFavoritesPage() {
  return (
    <ProtectedRoute>
      <FavoritesPage />
    </ProtectedRoute>
  );
}
