import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const loading = status === "loading";

  useEffect(() => {
    if (!loading) {
      // If the user is logged in, redirect to my-recipes
      // If not logged in, redirect to the all recipes page
      const targetPath = session ? "/recipes/my-recipes" : "/recipes";
      router.replace(targetPath);
    }
  }, [session, loading, router]);

  // Show a minimal loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
