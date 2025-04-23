import Head from "next/head";

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy | YourAppName</title>
      </Head>
      <main className="max-w-3xl mx-auto px-4 py-12 text-gray-800">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="mb-4">
          At <strong>MyDrive</strong>, we take your privacy seriously. This
          Privacy Policy outlines what data we collect, how we use it, and your
          rights.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          Information We Collect
        </h2>
        <ul className="list-disc pl-6 mb-4">
          <li>
            Email address and profile information (when signing in with Google)
          </li>
          <li>Usage data for improving the app</li>
          <li>
            Files and spreadsheet data if you grant access via Google
            Drive/Sheets APIs
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          How We Use Your Data
        </h2>
        <ul className="list-disc pl-6 mb-4">
          <li>To provide and maintain our services</li>
          <li>To improve user experience</li>
          <li>To communicate with you (if necessary)</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2">Data Sharing</h2>
        <p className="mb-4">
          We do not sell, rent, or trade your data. We may share data only when
          required by law or to protect our rights.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">
          Third-Party Services
        </h2>
        <p className="mb-4">
          Our app uses services like Google OAuth, Google Sheets API, and Google
          Drive API. Your data may be processed by these services as per their
          privacy policies.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">Your Rights</h2>
        <ul className="list-disc pl-6 mb-4">
          <li>You can request deletion of your data</li>
          <li>You can revoke app access from your Google Account settings</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2">Changes</h2>
        <p className="mb-4">
          We may update this policy occasionally. Continued use of the app after
          changes implies your acceptance.
        </p>

        <p className="text-sm text-gray-500 mt-8">
          Last updated: April 22, 2025
        </p>
      </main>
    </>
  );
}
