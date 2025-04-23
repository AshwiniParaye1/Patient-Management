//app/drive/page.tsx

"use client";

import { listFiles, uploadFile } from "@/lib/googleDrive";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

export default function DrivePage() {
  const { data: session, status } = useSession();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const router = useRouter();

  // Show session debug info
  useEffect(() => {
    console.log("Session object:", session);
    console.log("Token from session:", session?.accessToken);
  }, [session]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  async function fetchFiles() {
    const token = session?.accessToken;
    console.log("Using token:", token);

    if (!token) {
      setError("Access token is missing. Please sign in again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const files = await listFiles(token);
      setFiles(files);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err) {
      console.error("Error fetching files:", err);
      setError("Failed to load files from Google Drive.");
    } finally {
      setLoading(false);
    }
  }

  // Fetch files when session is available
  useEffect(() => {
    if (session?.accessToken) {
      fetchFiles();
    } else if (session && status === "authenticated" && !session.accessToken) {
      setError(
        "Access token is missing. You may need to sign out and sign in again."
      );
      setLoading(false);
    }
  }, [session, status]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile || !session?.accessToken) return;

    try {
      setUploading(true);
      await uploadFile(session.accessToken, selectedFile);
      // Refresh file list
      await fetchFiles();
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById(
        "fileInput"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err) {
      console.error("Error uploading file:", err);
      setError("Failed to upload file to Google Drive.");
    } finally {
      setUploading(false);
    }
  };

  if (status === "loading") {
    return <div className="p-8 text-center text-white">Loading...</div>;
  }

  if (status === "unauthenticated") {
    return null; // We'll redirect in the useEffect
  }

  return (
    <div className="max-w-6xl mx-auto p-8 text-black">
      <h1 className="text-4xl font-bold mb-8 border-b pb-4 text-white">
        My Google Drive Files
      </h1>

      {/* File upload section */}
      <div className="mb-10 p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
        <h2 className="text-2xl font-semibold mb-6">Upload to Drive</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            id="fileInput"
            type="file"
            onChange={handleFileChange}
            disabled={uploading || !session?.accessToken}
            className="border border-gray-300 rounded-lg p-3 flex-grow text-black bg-white"
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading || !session?.accessToken}
            className={`px-6 py-3 rounded-lg font-medium text-white ${
              !selectedFile || uploading || !session?.accessToken
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black hover:bg-gray-800 transition-colors"
            }`}
          >
            {uploading ? "Uploading..." : "Upload File"}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Files list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-black">
            Files in your Drive
            {lastRefreshed && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                Last updated: {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </h3>
          <button
            className="bg-black text-white px-4 py-2 rounded-lg flex items-center"
            onClick={fetchFiles}
            disabled={loading || !session?.accessToken}
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                Refreshing...
              </>
            ) : (
              "Refresh Files"
            )}
          </button>
        </div>

        {loading && files.length === 0 ? (
          <div className="text-center p-10 text-gray-600">
            <div className="inline-block animate-spin mr-2 w-5 h-5 border-2 border-black border-t-transparent rounded-full"></div>
            Loading your files...
          </div>
        ) : files.length === 0 ? (
          <div className="text-center p-10 text-gray-500">
            No files found in your Drive.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {files.map((file) => (
              <li
                key={file.id}
                className="px-6 py-5 flex items-center hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-black truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {file.mimeType.split("/").pop()}
                  </p>
                </div>
                <div>
                  <Link
                    href={`file/${file.id}`}
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
                  >
                    Open File
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
