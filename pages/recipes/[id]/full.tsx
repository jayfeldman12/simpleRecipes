import { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import { getAllRecipeIds, getRecipeData } from "../../../lib/recipes";
import { RecipeData } from "../../../types/recipe";

interface FullRecipeProps {
  recipe: RecipeData;
}

export default function FullRecipe({ recipe }: FullRecipeProps) {
  return (
    <div className="container">
      <h1>{recipe.meta.title}</h1>
      <Link href={`/recipes/${recipe.meta.id}`} className="back-link">
        ← Back to Recipe
      </Link>
      <div className="full-content">
        <pre>{recipe.fullText}</pre>
      </div>
      <style jsx>{`
        .container {
          max-width: 960px;
          margin: 2rem auto;
          padding: 2rem;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }
        h1 {
          text-align: center;
          font-size: 2rem;
          margin-bottom: 1rem;
          color: #333;
        }
        .back-link {
          display: inline-block;
          margin-bottom: 1rem;
          color: #0070f3;
          text-decoration: none;
          font-weight: bold;
        }
        .back-link:hover {
          text-decoration: underline;
        }
        .full-content {
          margin-top: 1rem;
          white-space: pre-wrap;
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 4px;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          font-size: 1rem;
          line-height: 1.6;
          color: #333;
          overflow-wrap: break-word;
          box-sizing: border-box;
        }
        .full-content pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          /* word-break removed to avoid breaking words in half */
          max-width: 100%;
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const ids = getAllRecipeIds();
  const paths = ids.map((id) => ({ params: { id } }));
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const id = params?.id as string;
  const recipe = getRecipeData(id);
  return { props: { recipe } };
};
