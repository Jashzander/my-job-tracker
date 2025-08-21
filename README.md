## Job Application Tracker (React + Vite + Firebase)

A lightweight, automation-first tracker for job applications. It minimizes typing and uses AI to extract details from job postings and generate content tailored to each role.

### Features

- **AI Auto-Fill from URL**: Paste a job posting URL (LinkedIn, Greenhouse, Lever, company careers). The app fetches a clean page via `r.jina.ai` and uses Gemini to extract fields: job title, company, location, employment type, salary range, and description.
- **AI Assistants**:
  - **Cover Letter**: Prefills with your profile + job context; generates a concise, professional letter.
  - **Resume Tuner**: Analyze a job description and get actionable tailoring tips.
  - **Resume Bullets**: Create 5–8 ATS-friendly, quantified bullet points tailored to the job.
- **Quick Actions**: One-click status updates (Applied, Interview, Rejected, Offer).
- **Filters and Search**: Filter by status and search by job title, company, or job ID.
- **Extended Fields**: Location, employment type, salary range, job description, next action, reminder time, and notes.
- **CSV Export**: Export all visible applications to CSV.
- **Settings**: Save profile summary, tech stack, and target roles locally. Optional local Gemini API key override.
- **Auth & Storage**: Anonymous Firebase Auth + Firestore per-user subcollection.

### Quickstart

1. Install dependencies
   - `npm install`

2. Create a `.env` file in the project root with your Firebase and (optionally) Gemini keys
   - Example:
```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx

# Optional: you can also set/override this per-browser in Settings
VITE_GEMINI_API_KEY=your_google_ai_studio_api_key
```

3. Configure Firebase
- In the Firebase console:
  - Create a project.
  - Enable Firestore (in Native/Production mode).
  - Enable Authentication and turn on Anonymous sign-in.
  - Copy your web app config into the `.env` above.

4. Run the app
   - `npm run dev`
   - Open the printed local URL.

### Usage Guide

- **Add a job with AI**
  - Paste the job posting URL at the top, click “Auto-Fill with AI,” review fields, and click “Add Application.”

- **Generate content**
  - In the table row, use buttons:
    - 📄 Resume Tuner
    - ✨ Cover Letter
    - 💡 Interview Questions
    - • • • Resume Bullets

- **Settings**
  - Click “Settings” in the header. Save your Profile Summary, Tech Stack, and Target Roles (stored in the browser). Optionally set a Gemini API key override (also stored locally).

- **Filter, Search, Export**
  - Use the search bar and status filter above the table. Click “Export CSV” in the header to download your data.

### How AI Works

- **Reader**: The app fetches a text-only version of the job page using `https://r.jina.ai/{url}` to avoid CORS issues and boilerplate HTML.
- **Model**: Prompts the Google Gemini model (`gemini-1.5-flash`) to extract fields or generate content. The key can come from `VITE_GEMINI_API_KEY` (build-time) or a local override in Settings (browser `localStorage`).

### Security and Privacy

- **Authentication**: Uses Firebase Anonymous Auth. Each user gets a Firestore path like `users/{uid}/jobApplications`.
- **Local-only data**: Settings and optional Gemini API key override are saved to the browser’s `localStorage`.
- **Firestore rules**: Ensure your rules restrict reads/writes to the authenticated user’s own data. Example (adapt as needed):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /jobApplications/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Troubleshooting

- **Auto-Fill fails or returns empty**: Some pages block scraping or contain very little text. Paste the description manually into the form, then use AI features.
- **Gemini errors**: Ensure your API key is valid and usage quotas aren’t exceeded. You can try the local override in Settings.
- **CORS issues**: The app uses `r.jina.ai` to avoid CORS for page text. If a specific site blocks it, paste content manually.

### Tech Stack

- React 19, Vite 7, Tailwind CSS 4
- Firebase Auth (Anonymous) and Firestore
- Google Gemini 1.5 Flash (client-side calls)

### Roadmap (ideas)

- Browser notifications for reminders set via `reminderAt`
- Kanban board (drag-and-drop by status)
- Chrome extension/bookmarklet to capture current tab’s job posting
