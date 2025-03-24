import { API_URL } from "../config";
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

/**
 * Get user favorite recipes
 */
export const getUserFavorites = async (): Promise<Recipe[]> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_URL}/recipes/favorites`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to get favorite recipes");
    }

    // Handle both array and object responses
    if (Array.isArray(data)) {
      return data;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    }

    return [];
  } catch (error) {
    console.error("Error getting user favorites:", error);
    return [];
  }
};

/**
 * Add a recipe to favorites
 */
export const addToFavorites = async (recipeId: string): Promise<boolean> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_URL}/recipes/${recipeId}/favorite`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to add to favorites");
    }

    return true;
  } catch (error) {
    console.error("Error adding to favorites:", error);
    return false;
  }
};

/**
 * Remove a recipe from favorites
 */
export const removeFromFavorites = async (
  recipeId: string
): Promise<boolean> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_URL}/recipes/${recipeId}/favorite`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to remove from favorites");
    }

    return true;
  } catch (error) {
    console.error("Error removing from favorites:", error);
    return false;
  }
};
