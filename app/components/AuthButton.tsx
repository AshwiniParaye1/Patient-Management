//app/components/AuthButton.tsx

"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  if (loading) {
    return <div className="text-black">Loading...</div>;
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <div className="hidden md:block">
          <p className="text-black font-medium">
            {session.user?.name || session.user?.email}
          </p>
        </div>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
    >
      Sign in
    </button>
  );
}
