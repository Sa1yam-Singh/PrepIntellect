# PrepIntellect — AI-Powered Mock Interview Platform

I built **PrepIntellect** to help developers and candidates practice for technical and behavioral interviews in a realistic, interactive environment. Rather than just reading mock questions, the platform acts as a real-time interviewer, listens to vocal answers, analyzes engagement, and evaluates answers across key criteria.

---

## 🚀 Key Features

* **AI Interviewer (Structured Flow)**: Conducts a 6-stage interview (Introduction, Behavioral/HR, Foundational Technical, Advanced Coding, System Design, and Wrap-up) tailored to a specific target role, experience level, and set of keywords. Powered by **Google Gemini 2.0 Flash**.
* **Live Bidirectional Audio Chamber**: Uses WebSockets to connect directly to the **Gemini 3.1 Live API (`gemini-3.1-flash-live-preview`)** with the `Aoede` voice, allowing for smooth, low-latency, real-time voice conversations.
* **Smart Transcription**: Transcribes recorded audio answers using **OpenAI Whisper (`whisper-1`)** on the backend, with a browser-based speech-to-text fallback in case of network issues.
* **Proctoring & Focus Telemetry**: Includes anti-cheating mechanisms such as tab-switching tracking and eye-gaze tracking powered by **MediaPipe Tasks-Vision** to keep interviews realistic.
* **Analytics Dashboard**: Tracks my interview history, cumulative streaks, average performance scores (Technical, Communication, Problem Solving) visualized with **Recharts**, and provides specific strengths, weaknesses, grammar feedback, and improvement tips.
* **Firebase Authentication**: Secure user onboarding and session management using Firebase Auth.

---

## 🛠️ Tech Stack

* **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Axios, Recharts, Firebase SDK, MediaPipe Vision.
* **Backend**: Node.js, Express, MongoDB (via Mongoose, using an in-memory MongoDB server for local development convenience), WebSockets (`ws`), Google Generative AI SDK, OpenAI SDK, Multer (for handling audio uploads).

---

## ⚙️ How I Setup & Run the Project

### 1. Backend Configuration
Create a `.env` file inside the `backend` directory using `backend/.env.example` as a template:

```env
PORT=3001
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_google_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
```

Then, install dependencies and start the backend:
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend Configuration
Create a `.env` file inside the `frontend` directory:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

Then, install dependencies and start the frontend:
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in the browser to start using the platform!

---

## 🌐 Production Deployment Guide

Deploying a full-stack, real-time application requires hosting the frontend and backend on services tailored to their specific needs.

### 1. Database Setup (MongoDB Atlas)
Since local development uses an ephemeral in-memory database, you need a persistent cloud database for production:
1. Sign up for a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new cluster (Shared/Free tier).
3. Under **Network Access**, add `0.0.0.0/24` (or configure to allow access from your backend host).
4. Under **Database Access**, create a database user and save the password.
5. Click **Connect** -> **Drivers** to get your connection string (looks like `mongodb+srv://<username>:<password>@cluster.xxxx.mongodb.net/?retryWrites=true&w=majority`). Replace `<username>` and `<password>` with your database user credentials.

### 2. Backend Deployment (Render or Railway)
Because the platform relies on **persistent WebSockets** for live bidirectional voice calling (Gemini Live API) and saves audio files locally, the backend must be deployed on a platform supporting persistent Node.js servers (not serverless functions).

#### Option A: Render
1. Create a free account at [Render](https://render.com).
2. Click **New** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Name**: `prepintellect-backend`
   - **Root Directory**: `backend` (or leave empty and set start command to `node backend/server.js`)
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js` (if Root Directory is `backend`)
5. Add the following **Environment Variables**:
   - `PORT`: `3001` (or leave default)
   - `MONGODB_URI`: *Your MongoDB Atlas connection string*
   - `GEMINI_API_KEY`: *Your Google Gemini API Key*
   - `OPENAI_API_KEY`: *Your OpenAI API Key*
6. Click **Deploy Web Service** and copy the generated service URL (e.g., `https://prepintellect-backend.onrender.com`).

#### Option B: Railway
1. Create an account at [Railway](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Choose the repository and set the root/start directory to `backend`.
4. Configure the same **Variables** as above.
5. Generate a domain under the service settings and copy it.

### 3. Frontend Deployment (Vercel)
The React/Vite frontend can be deployed directly to Vercel for high performance and global edge delivery.

1. Go to [Vercel](https://vercel.com) and log in.
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. In the Project configuration:
   - Set **Root Directory** to `frontend`.
   - Set **Framework Preset** to `Vite`.
   - Under **Build and Development Settings**, leave the defaults (`npm run build` and `dist`).
5. Open the **Environment Variables** panel and add the following keys:
   - `VITE_BACKEND_URL`: *The URL of your deployed backend service (e.g. `https://prepintellect-backend.onrender.com`)*. **Note: Do not include a trailing slash.**
   - Add your Firebase SDK keys:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
6. Click **Deploy**. Vercel will build the frontend and host it (e.g., at `https://prepintellect.vercel.app`).

