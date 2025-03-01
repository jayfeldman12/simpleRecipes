export interface RecipeMeta {
  id: string;
  title: string;
  externalImage: string;
}

export interface Ingredient {
  name: string;
  amount: string;
}

export interface Instruction {
  step: string;
}

export interface RecipeData {
  meta: RecipeMeta;
  ingredients: Ingredient[];
  instructions: Instruction[];
  fullText: string;
}
