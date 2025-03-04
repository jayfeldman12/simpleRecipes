import { Request, Response } from "express";
import Recipe from "../models/Recipe";
import User from "../models/User";
import { fetchHtmlFromUrl } from "../services/htmlFetchService";
import { extractRecipeFromHTML } from "../services/openaiService";
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

    const count = await Recipe.countDocuments();

    const recipes = await Recipe.find()
      .populate("user", "username")
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
    } = req.body;

    const recipe = new Recipe({
      title,
      description,
      ingredients: Array.isArray(ingredients) ? ingredients : [ingredients],
      instructions: Array.isArray(instructions) ? instructions : [instructions],
      cookingTime: cookingTime || undefined,
      servings: servings || undefined,
      imageUrl: imageUrl || "default-recipe.jpg",
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
    } = req.body;

    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      res.status(404).json({ message: "Recipe not found" });
      return;
    }

    // Check if the logged in user is the owner of the recipe
    if (recipe.user.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: "Not authorized to update this recipe" });
      return;
    }

    recipe.title = title || recipe.title;
    recipe.description = description || recipe.description;
    recipe.ingredients = ingredients
      ? Array.isArray(ingredients)
        ? ingredients
        : [ingredients]
      : recipe.ingredients;
    recipe.instructions = instructions
      ? Array.isArray(instructions)
        ? instructions
        : [instructions]
      : recipe.instructions;
    recipe.cookingTime =
      cookingTime !== undefined ? cookingTime : recipe.cookingTime;
    recipe.servings = servings !== undefined ? servings : recipe.servings;
    recipe.imageUrl = imageUrl || recipe.imageUrl;

    const updatedRecipe = await recipe.save();
    res.json(updatedRecipe);
  } catch (error) {
    console.error(error);
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

// @desc    Import recipe from URL
// @route   POST /api/recipes/import
// @access  Private
export const importRecipeFromUrl = async (req: IAuthRequest, res: Response) => {
  try {
    // Check authentication
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { url } = req.body;

    // Verify that url is provided
    if (!url) {
      return res.status(400).json({ message: "URL is required" });
    }

    // Fetch HTML content from the URL
    const htmlContent = await fetchHtmlFromUrl(url);
    if (!htmlContent) {
      return res
        .status(400)
        .json({ message: "Failed to fetch content from URL" });
    }

    console.log(
      `Successfully fetched HTML from ${url}, length: ${htmlContent.length} characters`
    );

    // Extract recipe data using OpenAI, passing the source URL
    const recipeData = await extractRecipeFromHTML(htmlContent, url);
    if (!recipeData) {
      return res
        .status(400)
        .json({ message: "Failed to extract recipe data from the URL" });
    }

    console.log("Successfully extracted recipe data:", recipeData.title);

    // Create a new recipe
    const userId = req.user._id;
    const recipe = new Recipe({
      ...recipeData,
      user: userId,
      sourceUrl: url, // Also set it explicitly here to ensure it's included
      imageUrl: recipeData.imageUrl || "default-recipe.jpg", // Set default image if none provided
    });

    // Save to database
    const savedRecipe = await recipe.save();
    console.log(`Recipe saved with ID: ${savedRecipe._id}`);

    // Return the recipe data and the ID for redirection
    return res.status(201).json({
      message: "Recipe imported successfully",
      recipe: recipeData,
      recipeId: savedRecipe._id,
    });
  } catch (error) {
    console.error("Error importing recipe:", error);
    return res
      .status(500)
      .json({ message: "Server error while importing recipe" });
  }
};
