import express from "express";
import {
  createRecipe,
  deleteRecipe,
  getFavoriteRecipes,
  getRecipeById,
  getRecipes,
  getUserRecipes,
  updateRecipe,
} from "../controllers/recipeController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

// Protected routes with specific paths (must be before /:id routes)
router.get("/user/recipes", protect, getUserRecipes);
router.get("/user/favorites", protect, getFavoriteRecipes);

// Public routes
router.get("/", getRecipes);
router.post("/", protect, createRecipe);

// Routes with parameters
router.get("/:id", getRecipeById);
router.put("/:id", protect, updateRecipe);
router.delete("/:id", protect, deleteRecipe);

export default router;
