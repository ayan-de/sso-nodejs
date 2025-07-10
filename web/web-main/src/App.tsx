import { useEffect, useState } from "react";
import "./App.css";

interface User {
  name: string;
  picture: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/verify", { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Not authenticated");
        }
        return res.json();
      })
      .then((data) => {
        if (data.valid) {
          setUser(data.user);
        }
      })
      .catch(() => {
        setUser(null);
      });
  }, []);

  return (
    <>
      <h1>ayande.com</h1>
      <br />
      {user ? (
        <>
          <h2>Welcome, {user.name}!</h2>
          <img src={user.picture} alt="Profile" width="50" height="50" />
          <br />
          <button
            onClick={() => {
              fetch("/api/logout", { credentials: "include" }).then(() =>
                window.location.reload()
              );
            }}
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <h2>Sign in :</h2>
          <button
            onClick={() => {
              window.location.href = "http://localhost:5000/auth/google";
            }}
          >
            Sign in with Google
          </button>
        </>
      )}
    </>
  );
}

export default App;
