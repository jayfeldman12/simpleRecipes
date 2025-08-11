import Link from "next/link";

type AuthErrorBannerProps = {
  error: string | null | undefined;
  className?: string;
  showLoginLink?: boolean;
  loginHref?: string;
  loginLabel?: string;
};

const AUTH_INDICATORS = [
  "not authorized",
  "no token",
  "token verification failed",
  "authentication required",
  "unauthorized",
];

const isAuthError = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return AUTH_INDICATORS.some((indicator) => normalized.includes(indicator));
};

const AuthErrorBanner = ({
  error,
  className = "",
  showLoginLink = true,
  loginHref = "/login?reauth=1",
  loginLabel = "Log in",
}: AuthErrorBannerProps) => {
  if (!error) return null;

  const shouldShowLogin = showLoginLink && isAuthError(error);

  return (
    <div
      className={`bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <span>{error}</span>
        {shouldShowLogin && (
          <Link
            href={loginHref}
            className="inline-flex items-center justify-center px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            {loginLabel}
          </Link>
        )}
      </div>
    </div>
  );
};

export default AuthErrorBanner;
