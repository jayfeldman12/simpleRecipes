import { Request, Response } from "express";
import Recipe from "../models/Recipe";
import User from "../models/User";
import { IAuthRequest } from "../types";

// @desc    Get all recipes
// @route   GET /api/recipes
// @access  Public
export const getRecipes = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;

    // Allow filtering by tag
    const filter: { tags?: { $in: string[] } } = {};
    if (req.query.tag) {
      filter.tags = { $in: [req.query.tag as string] };
    }

    const count = await Recipe.countDocuments(filter);

    const recipes = await Recipe.find(filter)
      .populate("user", "name")
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ createdAt: -1 });

    res.json({
      recipes,
      page,
      pages: Math.ceil(count / pageSize),
      totalRecipes: count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get recipe by ID
// @route   GET /api/recipes/:id
// @access  Public
export const getRecipeById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const recipe = await Recipe.findById(req.params.id).populate(
      "user",
      "name"
    );

    if (!recipe) {
      res.status(404).json({ message: "Recipe not found" });
      return;
    }

    res.json(recipe);
  } catch (error: any) {
    console.error(error);
    if (error.kind === "ObjectId") {
      res.status(404).json({ message: "Recipe not found" });
      return;
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create a new recipe
// @route   POST /api/recipes
// @access  Private
export const createRecipe = async (
  req: IAuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const {
      title,
      description,
      ingredients,
      instructions,
      cookingTime,
      servings,
      imageUrl,
      tags,
    } = req.body;

    const recipe = new Recipe({
      title,
      description,
      ingredients: Array.isArray(ingredients) ? ingredients : [ingredients],
      instructions: Array.isArray(instructions) ? instructions : [instructions],
      cookingTime,
      servings,
      imageUrl: imageUrl || "default-recipe.jpg",
      tags: tags || [],
      user: req.user._id,
    });

    const createdRecipe = await recipe.save();
    res.status(201).json(createdRecipe);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update a recipe
// @route   PUT /api/recipes/:id
// @access  Private
export const updateRecipe = async (
  req: IAuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const {
      title,
      description,
      ingredients,
      instructions,
      cookingTime,
      servings,
      imageUrl,
      tags,
    } = req.body;

    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      res.status(404).json({ message: "Recipe not found" });
      return;
    }

    // Check if user owns the recipe
    if (recipe.user.toString() !== req.user._id.toString()) {
      res
        .status(403)
        .json({ message: "User not authorized to update this recipe" });
      return;
    }

    recipe.title = title || recipe.title;
    recipe.description = description || recipe.description;
    recipe.ingredients = ingredients || recipe.ingredients;
    recipe.instructions = instructions || recipe.instructions;
    recipe.cookingTime = cookingTime || recipe.cookingTime;
    recipe.servings = servings || recipe.servings;
    recipe.imageUrl = imageUrl || recipe.imageUrl;
    recipe.tags = tags || recipe.tags;

    const updatedRecipe = await recipe.save();
    res.json(updatedRecipe);
  } catch (error: any) {
    console.error(error);
    if (error.kind === "ObjectId") {
      res.status(404).json({ message: "Recipe not found" });
      return;
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a recipe
// @route   DELETE /api/recipes/:id
// @access  Private
export const deleteRecipe = async (
  req: IAuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      res.status(404).json({ message: "Recipe not found" });
      return;
    }

    // Check if user owns the recipe
    if (recipe.user.toString() !== req.user._id.toString()) {
      res
        .status(403)
        .json({ message: "User not authorized to delete this recipe" });
      return;
    }

    await recipe.deleteOne();
    res.json({ message: "Recipe removed" });
  } catch (error: any) {
    console.error(error);
    if (error.kind === "ObjectId") {
      res.status(404).json({ message: "Recipe not found" });
      return;
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get user recipes
// @route   GET /api/recipes/user
// @access  Private
export const getUserRecipes = async (
  req: IAuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const recipes = await Recipe.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(recipes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get user favorite recipes
// @route   GET /api/recipes/favorites
// @access  Private
export const getFavoriteRecipes = async (
  req: IAuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const recipes = await Recipe.find({ _id: { $in: user.favorites } });
    res.json(recipes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
