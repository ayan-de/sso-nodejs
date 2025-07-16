import { useEffect, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const response = await fetch("http://localhost:5000/profile", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth login
  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = "http://localhost:5000/auth/google";
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/logout", {
        credentials: "include",
      });
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">ayande.com</h1>
          <p className="text-gray-600">Single Sign-On Demo</p>
        </header>

        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
          {user ? (
            <div className="text-center">
              <div className="mb-6">
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-blue-500"
                  />
                )}
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  Welcome, {user.name}!
                </h2>
                <p className="text-gray-600 mb-4">{user.email}</p>
              </div>

              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="text-green-800 text-sm">
                    ✅ Successfully authenticated via Google OAuth
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors duration-200 font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                Sign in to continue
              </h2>

              <button
                onClick={handleGoogleLogin}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </button>

              <p className="text-gray-500 text-sm mt-4">
                Click to authenticate with your Google account
              </p>
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="max-w-md mx-auto mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Debug Info:
          </h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Backend URL: http://localhost:5000</p>
            <p>Auth Status: {user ? "Authenticated" : "Not authenticated"}</p>
            <p>User ID: {user?.id || "N/A"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
