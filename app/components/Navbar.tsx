//app/components/Navbar.tsx

"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthButton from "./AuthButton";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 py-5 px-6">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-10">
          <Link href="/" className="text-2xl font-bold text-black">
            MyDrive
          </Link>

          <div className="hidden md:flex space-x-6">
            <Link
              href="/"
              className={`py-2 text-base ${
                pathname === "/"
                  ? "text-black font-medium border-b-2 border-black"
                  : "text-gray-700 hover:text-black"
              }`}
            >
              Home
            </Link>

            {session && (
              <Link
                href="/drive"
                className={`py-2 text-base ${
                  pathname === "/drive"
                    ? "text-black font-medium border-b-2 border-black"
                    : "text-gray-700 hover:text-black"
                }`}
              >
                My Drive
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
