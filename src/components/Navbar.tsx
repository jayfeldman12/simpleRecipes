import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className: string;
}

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Helper function to determine if a link should be clickable
  const NavLink = ({ href, children, className }: NavLinkProps) => {
    const isCurrentPath = router.pathname === href;

    if (isCurrentPath) {
      return <span className={className}>{children}</span>;
    }

    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              href={user ? "/recipes/my-recipes" : "/recipes"}
              className="flex-shrink-0 flex items-center"
            >
              <span className="text-xl font-bold text-indigo-600">
                SimpleRecipes
              </span>
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {user ? (
                <>
                  <NavLink
                    href="/recipes/my-recipes"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      router.pathname === "/recipes/my-recipes" ||
                      router.pathname === "/"
                        ? "border-indigo-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  >
                    My Recipes
                  </NavLink>
                  <NavLink
                    href="/recipes"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      router.pathname === "/recipes"
                        ? "border-indigo-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  >
                    All Recipes
                  </NavLink>
                  <NavLink
                    href="/recipes/favorites"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      router.pathname === "/recipes/favorites"
                        ? "border-indigo-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  >
                    Favorites
                  </NavLink>
                  <NavLink
                    href="/recipes/create"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      router.pathname === "/recipes/create"
                        ? "border-indigo-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  >
                    Create Recipe
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink
                    href="/recipes"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      router.pathname === "/recipes" || router.pathname === "/"
                        ? "border-indigo-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  >
                    All Recipes
                  </NavLink>
                </>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                {router.pathname !== "/login" ? (
                  <Link
                    href="/login"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Log in
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-gray-400">
                    Log in
                  </span>
                )}

                {router.pathname !== "/register" ? (
                  <Link
                    href="/register"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Register
                  </Link>
                ) : (
                  <span className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-400 cursor-default">
                    Register
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      <div className={`${isMenuOpen ? "block" : "hidden"} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          {user ? (
            <>
              <NavLink
                href="/recipes/my-recipes"
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  router.pathname === "/recipes/my-recipes" ||
                  router.pathname === "/"
                    ? "border-indigo-500 text-indigo-700 bg-indigo-50"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                }`}
              >
                My Recipes
              </NavLink>
              <NavLink
                href="/recipes"
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  router.pathname === "/recipes"
                    ? "border-indigo-500 text-indigo-700 bg-indigo-50"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                }`}
              >
                All Recipes
              </NavLink>
              <NavLink
                href="/recipes/favorites"
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  router.pathname === "/recipes/favorites"
                    ? "border-indigo-500 text-indigo-700 bg-indigo-50"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                }`}
              >
                Favorites
              </NavLink>
              <NavLink
                href="/recipes/create"
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  router.pathname === "/recipes/create"
                    ? "border-indigo-500 text-indigo-700 bg-indigo-50"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                }`}
              >
                Create Recipe
              </NavLink>
            </>
          ) : (
            <NavLink
              href="/recipes"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                router.pathname === "/recipes" || router.pathname === "/"
                  ? "border-indigo-500 text-indigo-700 bg-indigo-50"
                  : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
              }`}
            >
              All Recipes
            </NavLink>
          )}
        </div>
        <div className="pt-4 pb-3 border-t border-gray-200">
          {user ? (
            <div className="space-y-1">
              <div className="px-4 py-2">
                <p className="text-base font-medium text-gray-800">
                  {user.username}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="space-y-1 px-4">
              {router.pathname !== "/login" ? (
                <Link
                  href="/login"
                  className="block text-base font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Log in
                </Link>
              ) : (
                <span className="block text-base font-medium text-gray-400">
                  Log in
                </span>
              )}

              {router.pathname !== "/register" ? (
                <Link
                  href="/register"
                  className="block mt-2 w-full text-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Register
                </Link>
              ) : (
                <span className="block mt-2 w-full text-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-400 cursor-default">
                  Register
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
