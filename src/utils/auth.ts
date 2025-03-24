/**
 * Get the auth token from localStorage
 */
export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return localStorage.getItem("token");
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

/**
 * Set the auth token in localStorage
 */
export const setAuthToken = (token: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem("token", token);
  } catch (error) {
    console.error("Error setting auth token:", error);
  }
};

/**
 * Remove the auth token from localStorage
 */
export const removeAuthToken = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem("token");
  } catch (error) {
    console.error("Error removing auth token:", error);
  }
};

/**
 * Check if the user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};
