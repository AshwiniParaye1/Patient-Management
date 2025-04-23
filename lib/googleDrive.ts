//lib/googleDrive.ts

/**
 * Utility functions for interacting with Google Drive API
 */

// Function to list user's files from Google Drive
export async function listFiles(accessToken: string) {
  console.log(
    "listFiles called with token:",
    accessToken ? "Token exists" : "No token"
  );

  if (!accessToken) {
    throw new Error("No access token provided");
  }

  try {
    console.log(
      "Making request to Google Drive API with token:",
      accessToken.substring(0, 5) + "..."
    );

    // Added 'trashed=false' query parameter to filter out deleted files
    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name,mimeType,webViewLink)&q=trashed=false",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();
    console.log("Files retrieved:", data.files);
    // only return file type google sheet
    return data.files.filter(
      (file: any) => file.mimeType === "application/vnd.google-apps.spreadsheet"
    );
  } catch (error) {
    console.error("Error fetching files from Google Drive:", error);
    throw error;
  }
}

// Function to upload a file to Google Drive
export async function uploadFile(
  accessToken: string,
  file: File,
  metadata: any = {}
) {
  console.log(
    "uploadFile called with token:",
    accessToken ? "Token exists" : "No token"
  );

  if (!accessToken) {
    throw new Error("No access token provided");
  }

  try {
    // Create file metadata
    const fileMetadata = {
      name: file.name,
      ...metadata
    };

    // Create multipart form data
    const formData = new FormData();
    formData.append(
      "metadata",
      new Blob([JSON.stringify(fileMetadata)], { type: "application/json" })
    );
    formData.append("file", file);

    // Upload the file
    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Drive upload error response:", errorText);
      throw new Error(
        `File upload failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error uploading file to Google Drive:", error);
    throw error;
  }
}

// Function to download a file from Google Drive
export async function downloadFile(accessToken: string, fileId: string) {
  console.log(
    "downloadFile called with token:",
    accessToken ? "Token exists" : "No token"
  );

  if (!accessToken) {
    throw new Error("No access token provided");
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Drive download error response:", errorText);
      throw new Error(
        `File download failed: ${response.status} ${response.statusText}`
      );
    }

    return response.blob();
  } catch (error) {
    console.error("Error downloading file from Google Drive:", error);
    throw error;
  }
}

// Function to delete a file from Google Drive
export async function deleteFile(accessToken: string, fileId: string) {
  console.log(
    "deleteFile called with token:",
    accessToken ? "Token exists" : "No token"
  );

  if (!accessToken) {
    throw new Error("No access token provided");
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Drive delete error response:", errorText);
      throw new Error(
        `File deletion failed: ${response.status} ${response.statusText}`
      );
    }

    return true; // Successful deletion
  } catch (error) {
    console.error("Error deleting file from Google Drive:", error);
    throw error;
  }
}
