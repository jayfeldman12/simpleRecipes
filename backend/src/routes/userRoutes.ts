import express from "express";
import {
  addToFavorites,
  getUserProfile,
  loginUser,
  registerUser,
  removeFromFavorites,
  updateUserProfile,
} from "../controllers/userController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

// Public routes
router.post("/", registerUser);
router.post("/login", loginUser);

// Protected routes
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.post("/favorites/:recipeId", protect, addToFavorites);
router.delete("/favorites/:recipeId", protect, removeFromFavorites);

export default router;
