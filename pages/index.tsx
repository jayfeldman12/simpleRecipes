import { useRouter } from "next/router";
import { useEffect } from "react";
import { useAuth } from "../src/context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      // If the user is logged in, redirect to my-recipes
      // If not logged in, redirect to the all recipes page
      const targetPath = user ? "/recipes/my-recipes" : "/recipes";
      router.replace(targetPath);
    }
  }, [user, authLoading, router]);

  // Show a minimal loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
