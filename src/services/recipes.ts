import { getAuthToken } from "../utils/auth";

interface Recipe {
  _id: string;
  title: string;
  description: string;
  image?: string;
  ingredients: string[];
  cookingTime: number;
  steps: string[];
  createdAt: string;
  updatedAt: string;
  index?: number;
  recipeOrder?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

/**
 * Get user recipes
 */
export const getUserRecipes = async (): Promise<Recipe[]> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_URL}/recipes/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to get user recipes");
    }

    // Handle both array and object responses
    if (Array.isArray(data)) {
      return data;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    }

    return [];
  } catch (error) {
    console.error("Error getting user recipes:", error);
    return [];
  }
};

/**
 * Get a recipe by ID
 */
export const getRecipeById = async (id: string): Promise<Recipe | null> => {
  try {
    const response = await fetch(`${API_URL}/recipes/${id}`, {
      method: "GET",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to get recipe");
    }

    return data;
  } catch (error) {
    console.error(`Error getting recipe ${id}:`, error);
    return null;
  }
};

/**
 * Create a new recipe
 */
export const createRecipe = async (
  recipeData: Omit<Recipe, "_id" | "createdAt" | "updatedAt">
): Promise<Recipe | null> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_URL}/recipes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(recipeData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to create recipe");
    }

    return data;
  } catch (error) {
    console.error("Error creating recipe:", error);
    return null;
  }
};

/**
 * Update a recipe
 */
export const updateRecipe = async (
  id: string,
  recipeData: Partial<Recipe>
): Promise<Recipe | null> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_URL}/recipes/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(recipeData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update recipe");
    }

    return data;
  } catch (error) {
    console.error(`Error updating recipe ${id}:`, error);
    return null;
  }
};

/**
 * Delete a recipe
 */
export const deleteRecipe = async (id: string): Promise<boolean> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_URL}/recipes/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to delete recipe");
    }

    return true;
  } catch (error) {
    console.error(`Error deleting recipe ${id}:`, error);
    return false;
  }
};
