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
