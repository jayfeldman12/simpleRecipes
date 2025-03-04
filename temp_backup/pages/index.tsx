import Head from "next/head";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user } = useAuth();

  return (
    <>
      <Head>
        <title>Simple Recipes - Home</title>
        <meta
          name="description"
          content="A simple recipe sharing application"
        />
      </Head>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-indigo-600 px-6 py-12 text-white text-center">
            <h1 className="text-4xl font-bold">Welcome to Simple Recipes</h1>
            <p className="mt-2 text-xl">Share and discover delicious recipes</p>
          </div>

          <div className="p-6">
            {user ? (
              <div className="text-center">
                <p className="text-xl mb-4">Welcome back</p>
                <Link
                  href="/recipes"
                  className="inline-block px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700"
                >
                  Browse Recipes
                </Link>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <p className="text-gray-700 text-lg">
                  Join our community to share your favorite recipes and discover
                  new ones!
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/login"
                    className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 text-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="w-full sm:w-auto px-6 py-3 border border-indigo-600 text-indigo-600 font-medium rounded-md hover:bg-indigo-50 text-center"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Discover Recipes
            </h3>
            <p className="text-gray-600">
              Browse through hundreds of recipes shared by our community
              members.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Share Your Recipes
            </h3>
            <p className="text-gray-600">
              Create and share your own recipes with detailed instructions and
              ingredients.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Save Favorites
            </h3>
            <p className="text-gray-600">
              Save your favorite recipes to easily find them later.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
