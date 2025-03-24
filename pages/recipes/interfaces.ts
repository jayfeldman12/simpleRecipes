export interface Recipe {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  ingredients: string[];
  cookingTime: number;
  steps: string[];
  createdAt: string;
  updatedAt: string;
  index?: number;
  recipeOrder?: number;
  userRecipeOrder?: number;
  isFavorite?: boolean;
}
