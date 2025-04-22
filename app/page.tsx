import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16 text-black">
      <div className="flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Your files, accessible from anywhere
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl">
            Connect your Google Drive and manage your files seamlessly with our
            intuitive interface.
          </p>
          <Link
            href="/drive"
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors inline-flex items-center font-medium"
          >
            Go to My Drive
          </Link>
        </div>

        <div className="flex-1 flex justify-center">
          <Image
            src="/storage.svg"
            alt="Cloud Storage Illustration"
            width={500}
            height={400}
            priority
            className="max-w-full h-auto"
          />
        </div>
      </div>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="white"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Easy Upload</h3>
          <p className="text-gray-600">
            Upload files directly to your Google Drive with just a few clicks.
          </p>
        </div>

        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="white"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Access Anywhere</h3>
          <p className="text-gray-600">
            View and manage your Google Drive files from any device, anytime.
          </p>
        </div>

        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="white"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Secure Connection</h3>
          <p className="text-gray-600">
            Your files stay secure with Google's authentication and security
            protocols.
          </p>
        </div>
      </div>
    </div>
  );
}
