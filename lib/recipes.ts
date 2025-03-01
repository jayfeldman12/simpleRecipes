/// <reference types="node" />
import fs from "fs";
import path from "path";
import {
  Ingredient,
  Instruction,
  RecipeData,
  RecipeMeta,
} from "../types/recipe";

const recipesDir = path.join(process.cwd(), "public", "recipes");

function toPascalCase(str: string): string {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getAllRecipeIds(): string[] {
  return fs
    .readdirSync(recipesDir)
    .filter((name) => fs.statSync(path.join(recipesDir, name)).isDirectory());
}

export function getRecipeData(id: string): RecipeData {
  const recipeFolder = path.join(recipesDir, id);
  const metaPath = path.join(recipeFolder, "meta.json");
  let meta: RecipeMeta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

  const ingredientsPath = path.join(recipeFolder, "ingredients.json");
  const instructionsPath = path.join(recipeFolder, "instructions.json");
  const fullTextPath = path.join(recipeFolder, "full.txt");

  const ingredients: Ingredient[] = JSON.parse(
    fs.readFileSync(ingredientsPath, "utf-8")
  );
  const instructions: Instruction[] = JSON.parse(
    fs.readFileSync(instructionsPath, "utf-8")
  );
  const fullText: string = fs.readFileSync(fullTextPath, "utf-8");

  return { meta, ingredients, instructions, fullText };
}

export function getAllRecipes(): RecipeData[] {
  const ids = getAllRecipeIds();
  return ids.map((id) => getRecipeData(id));
}
