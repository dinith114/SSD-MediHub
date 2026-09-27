import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { base_url } from "../../Api/config";

// Shows the signed-in patient's account. This is the feature the "Sign in with
// Google" flow powers: a Google account arrives already email-verified, so the
// page shows a "Verified Patient" badge and unlocks instant appointment booking.
function ProfilePage() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [params] = useSearchParams();
  const justSignedInWithGoogle = params.get("googleLogin") === "success";

  useEffect(() => {
    axios
      .get(`${base_url}/user/patient/me`, { withCredentials: true })
      .then((res) => setUser(res.data.data))
      .catch(() =>
        setError("You are not signed in. Please sign in to view your account.")
      );
  }, []);

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-20 p-8 bg-white rounded-lg shadow text-center">
        <p className="text-gray-600 mb-4">{error}</p>
        <Link
          to="/login"
          className="inline-block bg-main_theme text-white font-semibold py-2 px-4 rounded-md"
          style={{ backgroundColor: "rgb(27, 120, 120)" }}
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (!user) {
    return <div className="text-center my-20 text-gray-500">Loading your account…</div>;
  }

  return (
    <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-lg shadow">
      {justSignedInWithGoogle && (
        <div className="mb-6 rounded-md bg-green-50 border border-green-200 text-green-800 px-4 py-3">
          Signed in with Google successfully.
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6">My Account</h1>

      <div className="space-y-2 text-gray-700">
        <p><span className="font-semibold">Name:</span> {user.firstName} {user.lastName}</p>
        <p><span className="font-semibold">Email:</span> {user.email}</p>
        <p><span className="font-semibold">Role:</span> {user.role}</p>
      </div>

      <div className="mt-6">
        {user.emailVerified ? (
          <span className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
            <span>✓</span> Verified Patient
            {user.authProvider === "google" ? " · via Google" : ""}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-semibold">
            Email not verified
          </span>
        )}
      </div>

      {user.emailVerified ? (
        <p className="mt-6 text-green-700">
          Because your email is verified, you can book appointments instantly — the
          manual verification step is skipped.
        </p>
      ) : (
        <p className="mt-6 text-gray-500">
          Verify your email to book appointments instantly. Signing in with Google
          verifies it automatically.
        </p>
      )}
    </div>
  );
}

export default ProfilePage;
