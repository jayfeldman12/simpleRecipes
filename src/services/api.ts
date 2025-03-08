const API_URL = "/api";

// Types
interface ApiError extends Error {
  status?: number;
}

interface RegisterData {
  username: string;
  password: string;
}

interface LoginData {
  username: string;
  password: string;
}

export interface User {
  _id: string;
  username: string;
  token: string;
}

// Helper function to handle API responses
const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();

  if (!response.ok) {
    const error: ApiError = new Error(data.message || "API error");
    error.status = response.status;
    throw error;
  }

  return data as T;
};

// Get the authentication token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user).token : null;
  }
  return null;
};

// Authentication API calls
export const authAPI = {
  // Register a new user
  register: async (userData: RegisterData): Promise<User> => {
    const response = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    return handleResponse<User>(response);
  },

  // Login a user
  login: async (credentials: LoginData): Promise<User> => {
    const response = await fetch(`${API_URL}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    return handleResponse<User>(response);
  },

  // Get user profile
  getProfile: async (): Promise<User> => {
    const token = getAuthToken();

    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_URL}/users/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return handleResponse<User>(response);
  },
};

// Recipe API calls
export const recipeAPI = {
  // Get all recipes
  getRecipes: async (page = 1, tag?: string, showAll = true): Promise<any> => {
    let url = `${API_URL}/recipes?page=${page}&all=${showAll}`;

    if (tag) {
      url += `&tag=${tag}`;
    }

    // Add auth token if available for getting favorite status
    const token = getAuthToken();
    const headers: HeadersInit = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    return handleResponse(response);
  },

  // Get a single recipe by ID
  getRecipeById: async (id: string): Promise<any> => {
    const response = await fetch(`${API_URL}/recipes/${id}`);
    return handleResponse(response);
  },

  // Create a new recipe (requires authentication)
  createRecipe: async (recipeData: any): Promise<any> => {
    const token = getAuthToken();

    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_URL}/recipes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(recipeData),
    });

    return handleResponse(response);
  },

  // Update a recipe (requires authentication)
  updateRecipe: async (id: string, recipeData: any): Promise<any> => {
    const token = getAuthToken();

    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_URL}/recipes/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(recipeData),
    });

    return handleResponse(response);
  },

  // Delete a recipe (requires authentication)
  deleteRecipe: async (id: string): Promise<any> => {
    const token = getAuthToken();

    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_URL}/recipes/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return handleResponse(response);
  },

  // Get user's recipes (requires authentication)
  getUserRecipes: async (): Promise<any> => {
    const token = getAuthToken();

    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_URL}/recipes/user/recipes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return handleResponse(response);
  },

  // Get user's favorite recipes (requires authentication)
  getFavoriteRecipes: async (): Promise<any> => {
    const token = getAuthToken();

    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_URL}/recipes/user/favorites`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return handleResponse(response);
  },

  // Add a recipe to favorites (requires authentication)
  addToFavorites: async (recipeId: string): Promise<any> => {
    const token = getAuthToken();

    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_URL}/users/favorites/${recipeId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return handleResponse(response);
  },

  // Remove a recipe from favorites (requires authentication)
  removeFromFavorites: async (recipeId: string): Promise<any> => {
    const token = getAuthToken();

    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_URL}/users/favorites/${recipeId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return handleResponse(response);
  },

  // Import a recipe from a URL (requires authentication)
  importRecipeFromUrl: async (url: string): Promise<any> => {
    const token = getAuthToken();

    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${API_URL}/recipes/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });

    return handleResponse(response);
  },
};
