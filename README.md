# My Drive

https://www.loom.com/share/3ca892f9ecbc410086bd2eaceea306b6?sid=92dcb195-952a-4270-b14e-2799b4424039

## 📝 Description

This app allows users to view, edit, and manage Google Sheets files stored on their Google Drive. The app integrates with Google Sheets and Google Drive APIs, offering users seamless management of their spreadsheet data.

Note: This app is currently in testing and is only available for test users. It has not yet been published to the Google Cloud Console because it is still in development and under internal testing. Only a select group of users are authorized to use it at this stage due to Google's security concerns and verification requirements.

## ✨ Features

- Authenticate with Google: Secure user authentication with Google OAuth2.

- Google Sheets Management: Users can view, edit, and delete rows from their Google Sheets.

- Drive Integration: Users can create, upload, and sync Google Sheets with their Google Drive account.

## 🔧 Technologies Used

- TypeScript
- CSS
- JavaScript
- React
- Next.js
- Google OAuth2
- Node.js

## 📦 Installation

Follow these steps to get the app up and running locally:

### 1. Clone this repository

```bash
git clone https://github.com/AshwiniParaye1/Patient-Management.git

cd Patient-Management
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up your Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Enable the following APIs:
   - **Google Sheets API**
   - **Google Drive API**
4. Go to **APIs & Services > Credentials**, and click **Create Credentials > OAuth client ID**.
5. Choose **Web application** and configure the authorized redirect URI (e.g., `http://localhost:3000/auth/signin/google`).
6. Download the `credentials.json` file (if applicable) or note your **Client ID** and **Client Secret**.

### 4. Configure environment variables

Create a `.env` file in the root directory of the project and add the following:

```ini
NEXTAUTH_SECRET=your-nextauth-secret-key-here
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 5. Run the app

Start the development server with:

```bash
npm start
```

## 🔐 Scopes Used

This app requests the following OAuth scopes to access the necessary Google services:

### 📄 Google Sheets

`https://www.googleapis.com/auth/spreadsheets`

- Allows the app to **read and write data** to Google Sheets files.
- Used for viewing, editing, and updating spreadsheet content.

### 📁 Google Drive (File Access)

`https://www.googleapis.com/auth/drive.file`

- Allows the app to **read and write files that the app creates or that the user selects**.
- Used for uploading, updating, and deleting Google Sheets files on the user's Drive.

---

## ❓ Why These Scopes Are Needed

- **Google Sheets Scope**: Required to view and modify sheet content so users can interact with their spreadsheet data directly from the app.
- **Drive File Scope**: Used to manage only the files the user has created with or explicitly selected for this app — **we do not request full access to the user's Drive**.

## 📂 Project Structure

```

├── app
│ ├── api
│ │ ├── auth
│ │ │ ├── [...nextauth]
│ │ │ │ ├── route.ts
│ ├── auth
│ │ ├── signin
│ │ │ ├── page.tsx
│ ├── components
│ │ ├── AddPatientDialog.tsx
│ │ ├── AuthButton.tsx
│ │ ├── Navbar.tsx
│ ├── drive
│ │ ├── page.tsx
│ ├── file
│ │ ├── [id]
│ │ │ ├── googleSheetsApi.ts
│ │ │ ├── loading.tsx
│ │ │ ├── page.tsx
│ ├── globals.css
│ ├── layout.tsx
│ ├── page.tsx
│ ├── privacy
│ │ ├── page.tsx
│ ├── providers.tsx
├── lib
│ ├── googleDrive.ts
│ ├── utils.ts
├── middleware.ts
├── package.json
├── public
├── types
│ ├── next-auth.d.ts
│ ├── sheet.ts

```

## 🚀 How to Use

- Authenticate: Click the "Sign In" button to authenticate with your Google account.

- View Sheets: Once authenticated, the app will list available Google Sheets from your Drive.

- Edit Sheets: Select a Sheet, make changes, and save updates.

- Sync with Drive: All changes are reflected in Google Drive, and you can delete files as needed.

## 🤝 Contribution

We welcome contributions! Here's how you can contribute:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and commit them.
4.  Push your changes to your fork.
5.  Submit a pull request.

## ❤️ Support

Thank you for checking out My Drive! If you find it useful, consider giving it a star on GitHub!

```

```

```

```

```

```
