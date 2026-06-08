// ── PrepIntellect Backend Server ─────────────────────────────────
// Express + Mongoose + Gemini AI + OpenAI Whisper

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

const User = require("./models/User");
const Session = require("./models/Session");

// ── Configuration ───────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;
const MAX_QUESTIONS = 6;

// Multer — store uploaded audio blobs in a temp directory
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) =>
    cb(null, `audio_${Date.now()}${path.extname(file.originalname) || ".webm"}`),
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } }); // 25 MB max

// ── AI Clients ──────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// ── Mock Fallback Questions (Structured Stage Alignment) ────────
const MOCK_QUESTIONS = [
  "Welcome to the interview! To start off, could you please introduce yourself, tell me about your background, and why you are interested in this position?",
  "Tell me about a time you faced a difficult challenge or conflict during a previous technical project. What was the situation, and how did you resolve it?",
  "Let's move on to technical fundamentals. Can you explain the difference between a stack and a queue? In what scenarios would you choose one over the other?",
  "What is the average and worst-case time complexity of common operations in a hash map? How does it handle collisions under the hood?",
  "How would you design a scalable URL shortening service like bit.ly? What are the key components and database selection considerations?",
  "We are at the end of the interview. Do you have any questions for me, or is there anything else you'd like to highlight about your skills?",
];

const MOCK_REACTIONS = [
  "That's a solid foundation. You clearly understand the core concepts here.",
  "Interesting approach. Let me challenge you a bit more on this topic.",
  "Good thinking. I can see you have practical experience with this.",
  "I appreciate the structured way you broke that down. Let's go deeper.",
];

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// ── Middleware ───────────────────────────────────────────────────
app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Request logger — helps debug hanging requests
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Utility: Build Gemini System Prompt ─────────────────────────
function buildSystemPrompt(user) {
  return [
    `You are a senior technical interviewer at a top-tier technology company.`,
    `You are interviewing a candidate for the role of "${user.targetRole}".`,
    `The candidate's experience level is "${user.experienceLevel}".`,
    `Their key skills include: ${user.skillsKeywords.join(", ") || "general software engineering"}.`,
    ``,
    `Rules:`,
    `- Ask exactly ONE focused technical question at a time.`,
    `- Tailor questions to the candidate's role and listed skills.`,
    `- Start with a moderate difficulty question and progressively increase.`,
    `- Be concise — keep each question under 3 sentences.`,
    `- Do NOT provide the answer. Only ask the question.`,
  ].join("\n");
}

// ── Utility: Build Evaluation Prompt (Enhanced) ─────────────────
function buildEvaluationPrompt(user, chatHistory) {
  const transcript = chatHistory
    .map(
      (entry, i) =>
        `Q${i + 1}: ${entry.question}\nA${i + 1}: ${entry.transcribedAnswer || "(no answer)"}`
    )
    .join("\n\n");

  return [
    `You are an expert technical interview evaluator. Be thorough, specific, and constructive.`,
    `You are evaluating a mock technical interview for the role of "${user.targetRole}" (${user.experienceLevel}).`,
    `Skills tested: ${user.skillsKeywords.join(", ") || "general"}.`,
    ``,
    `Here is the full interview transcript:`,
    `---`,
    transcript,
    `---`,
    ``,
    `Evaluate the candidate carefully on these criteria:`,
    `1. **Technical Knowledge** (0-100): Accuracy, depth, and correctness of technical concepts. Did they demonstrate understanding of fundamentals and advanced topics?`,
    `2. **Communication** (0-100): Clarity of explanation, structured thinking, use of examples. Were they articulate and easy to follow?`,
    `3. **Problem Solving** (0-100): Analytical approach, breaking down problems, considering edge cases, proposing solutions methodically.`,
    ``,
    `For each question, provide a 1-sentence feedback on the candidate's answer quality.`,
    ``,
    `Produce a JSON evaluation with EXACTLY this structure (no markdown fences, pure JSON):`,
    `{`,
    `  "technicalScore": <0-100>,`,
    `  "communicationScore": <0-100>,`,
    `  "problemSolvingScore": <0-100>,`,
    `  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],`,
    `  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>"],`,
    `  "grammarIssues": ["<specific grammar/language issue 1>", ...],`,
    `  "perQuestionFeedback": ["<feedback for Q1>", "<feedback for Q2>", "<feedback for Q3>", "<feedback for Q4>"],`,
    `  "improvementTips": ["<actionable tip 1>", "<actionable tip 2>", "<actionable tip 3>"]`,
    `}`,
    ``,
    `Rules for evaluation:`,
    `- Be specific. Reference actual content from the candidate's answers.`,
    `- Do NOT give generic feedback like "could improve". State exactly what was missing or wrong.`,
    `- If the candidate didn't answer a question, score it low and note it clearly.`,
    `- Strengths and weaknesses should reference specific answers, not be generic platitudes.`,
    `- Improvement tips should be actionable steps the candidate can practice.`,
    `- If grammar was fine, return an empty array for grammarIssues.`,
  ].join("\n");
}

// ── Utility: Transcribe Audio via Whisper ───────────────────────
async function transcribeAudio(filePath) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      response_format: "text",
    });
    return transcription;
  } catch (err) {
    console.error("[Whisper] Transcription error:", err.message);
    return "(transcription failed)";
  } finally {
    // Keep temp audio files so candidates can review their recorded answers
    // fs.unlink(filePath, () => {});
  }
}

// ── Utility: Retry with Exponential Backoff ─────────────────────
async function retryWithBackoff(fn, maxRetries = 1) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err.status === 429 || err.message?.includes("429");
      if (!is429 || attempt === maxRetries) throw err;

      // Fast backoff for responsive fallback logic
      const baseDelay = Math.pow(2, attempt) * 500; // 500ms
      const jitter = Math.random() * 200;
      const delay = baseDelay + jitter;
      console.log(`[Gemini] Rate limited — retrying fast in ${(delay / 1000).toFixed(2)}s (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// ── Utility: Generate Question via Gemini (with mock fallback) ──
async function generateQuestion(systemPrompt, previousQA) {
  const questionIndex = previousQA ? previousQA.length : 0;

  try {
    const parts = [{ text: systemPrompt }];

    let stagePrompt = "";
    if (questionIndex === 0) {
      stagePrompt = [
        `Stage: INTRODUCTION & WELCOME (Warmup)`,
        `Instruction: Introduce yourself warmly as the PrepIntellect AI Interviewer. Welcoming the candidate and invite them to introduce themselves (e.g. ask "Tell me about yourself, your background, and what roles you are preparing for"). Keep it natural, conversational, and friendly.`
      ].join("\n");
    } else if (questionIndex === 1) {
      stagePrompt = [
        `Stage: HR & BEHAVIORAL METHODOLOGY`,
        `Instruction: Transition naturally. Ask a situational HR behavioral question to evaluate their soft skills, handling challenges, or teamwork (e.g. "Can you describe a time you worked on a team with someone who had a different work style or perspective, and how you worked together to ensure project success?").`
      ].join("\n");
    } else if (questionIndex === 2) {
      stagePrompt = [
        `Stage: FOUNDATIONAL TECHNICAL PRINCIPLES`,
        `Instruction: Move on to technical fundamentals. Ask a core foundational question relating to the candidate's keywords, target role, or skills. Focus on base concepts, language mechanics, or architecture foundations.`
      ].join("\n");
    } else if (questionIndex === 3) {
      stagePrompt = [
        `Stage: ADVANCED CODING & OPTIMIZATION`,
        `Instruction: Ask an advanced coding or algorithmic problem solving question. Challenge them on edge cases, time/space complexity, performance, or optimizations related to their target role.`
      ].join("\n");
    } else if (questionIndex === 4) {
      stagePrompt = [
        `Stage: SCENARIO SYSTEM DESIGN OR TROUBLESHOOTING`,
        `Instruction: Ask a system design or live troubleshooting scenario question (e.g. design a scaling component, handle distributed state, or troubleshoot a performance degradation).`
      ].join("\n");
    } else if (questionIndex === 5) {
      stagePrompt = [
        `Stage: WRAP-UP & CLOSING`,
        `Instruction: Conclude the interview. Ask if they have any questions for you, or invite them to share any final details about their projects or skills. Thank them for their time.`
      ].join("\n");
    }

    if (previousQA && previousQA.length > 0) {
      const history = previousQA
        .map(
          (entry, i) =>
            `Question ${i + 1}: ${entry.question}\nCandidate Answer: ${entry.transcribedAnswer || "(no answer)"}`
        )
        .join("\n\n");
      
      parts.push({
        text: [
          `Here is the interview history log so far:`,
          `---`,
          history,
          `---`,
          ``,
          stagePrompt,
          ``,
          `Task:`,
          `Analyze the candidate's last answer.`,
          `1. Do NOT repeat any previous questions.`,
          `2. Acknowledge the context of their past responses implicitly, but move to the current stage question.`,
          `3. Ask exactly ONE focused question. Keep it concise (under 3 sentences).`
        ].join("\n")
      });
    } else {
      parts.push({ text: stagePrompt });
    }

    const questionText = await retryWithBackoff(async () => {
      const result = await geminiModel.generateContent(parts.map((p) => p.text).join("\n"));
      const response = result.response;
      return response.text().trim();
    });
    
    if (questionText) return questionText;
    throw new Error("Empty response from Gemini model");
  } catch (err) {
    console.warn(`[Gemini] Failed to generate question ${questionIndex + 1}:`, err.message?.slice(0, 150));
    console.log(`[Mock Fallback] Serving mock question ${questionIndex + 1}`);
    return MOCK_QUESTIONS[questionIndex % MOCK_QUESTIONS.length];
  }
}

// ── Utility: Generate AI Reaction to Candidate's Answer ─────────
async function generateReaction(systemPrompt, question, answer) {
  try {
    const reactionPrompt = [
      systemPrompt,
      ``,
      `The candidate was asked: "${question}"`,
      `Their answer was: "${answer}"`,
      ``,
      `Give a brief, natural 1-2 sentence reaction to their answer as an interviewer would.`,
      `- If they answered well, acknowledge what was good specifically.`,
      `- If they struggled, be encouraging and note what they could improve.`,
      `- If they didn't answer, acknowledge that briefly and move on.`,
      `- Keep it conversational and human. Sound like a real interviewer, not a robot.`,
      `- Do NOT ask a new question. Just react to their answer.`,
      `- Keep it under 40 words.`,
    ].join("\n");

    const reactionText = await retryWithBackoff(async () => {
      const result = await geminiModel.generateContent(reactionPrompt);
      return result.response.text().trim();
    });

    if (reactionText) return reactionText;
    throw new Error("Empty reaction");
  } catch (err) {
    console.warn("[Gemini] Failed to generate reaction:", err.message?.slice(0, 100));
    const idx = Math.floor(Math.random() * MOCK_REACTIONS.length);
    return MOCK_REACTIONS[idx];
  }
}

// ── Utility: Generate Mock Evaluation ───────────────────────────
function generateMockEvaluation(chatHistory) {
  // Generate somewhat realistic scores based on answer content
  const answeredCount = chatHistory.filter((q) => q.transcribedAnswer && q.transcribedAnswer !== "(no answer)" && q.transcribedAnswer !== "(no audio submitted)" && q.transcribedAnswer !== "(transcription failed)").length;
  const totalQuestions = chatHistory.length;
  const answerRate = totalQuestions > 0 ? answeredCount / totalQuestions : 0;

  const avgLength = chatHistory.reduce((sum, q) => sum + (q.transcribedAnswer?.length || 0), 0) / Math.max(totalQuestions, 1);
  const depthBonus = Math.min(avgLength / 5, 20); // longer answers get a bonus up to 20pts

  const technicalScore = Math.round(Math.min(40 + answerRate * 35 + depthBonus + Math.random() * 10, 100));
  const communicationScore = Math.round(Math.min(45 + answerRate * 30 + depthBonus * 0.8 + Math.random() * 10, 100));
  const problemSolvingScore = Math.round(Math.min(38 + answerRate * 32 + depthBonus * 0.9 + Math.random() * 12, 100));

  return {
    technicalScore,
    communicationScore,
    problemSolvingScore,
    strengths: [
      answeredCount > 0 ? "Attempted to answer questions with relevant context" : "Showed up and engaged with the interview process",
      "Demonstrated willingness to tackle technical problems",
      avgLength > 100 ? "Provided detailed, thorough responses" : "Kept answers concise and focused",
    ],
    weaknesses: [
      answeredCount < totalQuestions ? `Did not answer ${totalQuestions - answeredCount} of ${totalQuestions} questions` : "Could elaborate more on edge cases",
      "Consider providing more real-world examples from past experience",
      "Practice structuring answers using the STAR method for behavioral questions",
    ],
    grammarIssues: [],
    perQuestionFeedback: chatHistory.map((q, i) => {
      if (!q.transcribedAnswer || q.transcribedAnswer === "(no answer)") {
        return `Q${i + 1}: No answer provided.`;
      }
      return `Q${i + 1}: Answer was ${q.transcribedAnswer.length > 100 ? "detailed" : "brief"} — ${q.transcribedAnswer.length > 100 ? "good depth shown" : "consider elaborating more"}.`;
    }),
    improvementTips: [
      "Practice explaining concepts out loud to build verbal fluency",
      "Study common data structure time/space complexity trade-offs",
      "Prepare 2-3 real project examples you can reference during interviews",
    ],
  };
}

// ═════════════════════════════════════════════════════════════════
// ROUTES
// ═════════════════════════════════════════════════════════════════

// ── Health Check ────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Create or Update User (upsert / onboarding) ──────────────────
app.post("/api/users", async (req, res) => {
  try {
    const { name, email, targetRole, experienceLevel, skillsKeywords } = req.body;
    
    // Find existing user by email
    let user = await User.findOne({ email });
    if (user) {
      user.name = name || user.name;
      user.targetRole = targetRole || user.targetRole;
      user.experienceLevel = experienceLevel || user.experienceLevel;
      user.skillsKeywords = skillsKeywords || user.skillsKeywords;
      await user.save();
      return res.status(200).json(user);
    }

    user = await User.create({
      name,
      email,
      targetRole,
      experienceLevel,
      skillsKeywords,
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/stats/:email ───────────────────────────────────────
// Aggregated stats for the dashboard — real data, no fakes
app.get("/api/stats/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        totalSessions: 0,
        avgTechnicalScore: 0,
        avgCommunicationScore: 0,
        avgProblemSolvingScore: 0,
        lastSessionDate: null,
        currentStreak: 0,
      });
    }

    const sessions = await Session.find({ userId: user._id, status: "completed" })
      .sort({ createdAt: -1 })
      .lean();

    const totalSessions = sessions.length;

    if (totalSessions === 0) {
      return res.json({
        totalSessions: 0,
        avgTechnicalScore: 0,
        avgCommunicationScore: 0,
        avgProblemSolvingScore: 0,
        lastSessionDate: null,
        currentStreak: 0,
      });
    }

    const avgTechnicalScore = Math.round(
      sessions.reduce((sum, s) => sum + (s.finalEvaluation?.technicalScore || 0), 0) / totalSessions
    );
    const avgCommunicationScore = Math.round(
      sessions.reduce((sum, s) => sum + (s.finalEvaluation?.communicationScore || 0), 0) / totalSessions
    );
    const avgProblemSolvingScore = Math.round(
      sessions.reduce((sum, s) => sum + (s.finalEvaluation?.problemSolvingScore || 0), 0) / totalSessions
    );

    const lastSessionDate = sessions[0]?.createdAt || null;

    // Calculate streak: consecutive days with at least one completed session
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionDates = [...new Set(
      sessions.map(s => {
        const d = new Date(s.createdAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    )].sort((a, b) => b - a);

    if (sessionDates.length > 0) {
      const oneDayMs = 86400000;
      // Check if the latest session is today or yesterday
      const diffFromToday = today.getTime() - sessionDates[0];
      if (diffFromToday <= oneDayMs) {
        currentStreak = 1;
        for (let i = 1; i < sessionDates.length; i++) {
          if (sessionDates[i - 1] - sessionDates[i] === oneDayMs) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    res.json({
      totalSessions,
      avgTechnicalScore,
      avgCommunicationScore,
      avgProblemSolvingScore,
      lastSessionDate,
      currentStreak,
    });
  } catch (err) {
    console.error("[/api/stats]", err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/sessions/user/:email ───────────────────────────────
// Returns recent completed sessions for a user — for the activity log
app.get("/api/sessions/user/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const user = await User.findOne({ email });
    if (!user) return res.json([]);

    const sessions = await Session.find({ userId: user._id, status: "completed" })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "name email targetRole experienceLevel")
      .lean();

    res.json(sessions);
  } catch (err) {
    console.error("[/api/sessions/user]", err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/interview/start ───────────────────────────────────
// Starts a new interview session for a given userId
app.post("/api/interview/start", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required." });

    // Fetch user profile
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    // Build system prompt and generate first question
    const systemPrompt = buildSystemPrompt(user);
    const question = await generateQuestion(systemPrompt, []);

    // Create new session document
    const session = await Session.create({
      userId: user._id,
      chatHistory: [{ question, aiReaction: "", transcribedAnswer: "", durationSeconds: 0 }],
      cheatingInfractions: [],
      status: "active",
    });

    res.status(201).json({
      sessionId: session._id,
      questionIndex: 0,
      question,
      totalQuestions: MAX_QUESTIONS,
    });
  } catch (err) {
    console.error("[/api/interview/start]", err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/interview/next ────────────────────────────────────
// Receives audio blob + infraction telemetry, transcribes, evaluates
app.post("/api/interview/next", upload.single("audio"), async (req, res) => {
  try {
    const { sessionId, durationSeconds, infractions } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId is required." });

    // Fetch session
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found." });
    if (session.status === "completed") {
      return res.status(400).json({ error: "Session already completed." });
    }

    // Fetch user for prompt construction
    const user = await User.findById(session.userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    // ── Transcribe the uploaded audio (With Frontend Real-time STT Fallback) ──
    let transcribedText = req.body.transcribedText || "";
    if (!transcribedText.trim() || transcribedText === "(no audio submitted)" || transcribedText === "(transcription failed)") {
      if (req.file) {
        transcribedText = await transcribeAudio(req.file.path);
      } else {
        transcribedText = "(no answer provided)";
      }
    }

    // ── Update the current question block ────────────────────────
    const currentIndex = session.chatHistory.length - 1;
    session.chatHistory[currentIndex].transcribedAnswer = transcribedText;
    session.chatHistory[currentIndex].durationSeconds = parseInt(durationSeconds, 10) || 0;
    if (req.file) {
      session.chatHistory[currentIndex].audioUrl = `/uploads/${req.file.filename}`;
    }

    // ── Append infraction telemetry ──────────────────────────────
    if (infractions) {
      const parsed =
        typeof infractions === "string" ? JSON.parse(infractions) : infractions;
      if (Array.isArray(parsed)) {
        parsed.forEach((inf) => {
          session.cheatingInfractions.push({
            infractionType: inf.infractionType || "TAB_SWITCH",
            timestamp: inf.timestamp ? new Date(inf.timestamp) : new Date(),
          });
        });
      }
    }

    // ── Generate AI Reaction and Next Question (Optimized Parallel Pipeline) ──
    const systemPrompt = buildSystemPrompt(user);
    const currentQuestion = session.chatHistory[currentIndex].question;
    const answeredCount = session.chatHistory.length;

    let aiReaction;
    let nextQuestion;

    if (answeredCount >= MAX_QUESTIONS) {
      // Final question — only generate reaction (no next question)
      aiReaction = await generateReaction(systemPrompt, currentQuestion, transcribedText);
      session.chatHistory[currentIndex].aiReaction = aiReaction;

      // ── Final Evaluation Pipeline ──────────────────────────────
      let evaluation;
      try {
        const evalPrompt = buildEvaluationPrompt(user, session.chatHistory);
        const evalResult = await retryWithBackoff(async () => {
          return await geminiModel.generateContent(evalPrompt);
        });
        const evalText = evalResult.response.text();

        // Parse the JSON from Gemini's response
        try {
          const cleaned = evalText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
          evaluation = JSON.parse(cleaned);
        } catch (err) {
          console.warn("[Gemini] JSON parse failed, fallback to mock evaluation:", err.message);
          evaluation = generateMockEvaluation(session.chatHistory);
        }
      } catch (err) {
        console.warn("[Gemini] Evaluation API failed, using mock fallback:", err.message?.slice(0, 150));
        evaluation = generateMockEvaluation(session.chatHistory);
      }

      session.finalEvaluation = evaluation;
      session.status = "completed";
      await session.save();

      return res.json({
        complete: true,
        questionIndex: answeredCount - 1,
        transcribedAnswer: transcribedText,
        aiReaction,
        evaluation,
      });
    }

    // Not the final question: generate reaction and next question in parallel
    const [reactionResult, questionResult] = await Promise.all([
      generateReaction(systemPrompt, currentQuestion, transcribedText),
      generateQuestion(systemPrompt, session.chatHistory)
    ]);

    aiReaction = reactionResult;
    nextQuestion = questionResult;
    session.chatHistory[currentIndex].aiReaction = aiReaction;

    // Push the new question into chat history
    session.chatHistory.push({
      question: nextQuestion,
      aiReaction: "",
      transcribedAnswer: "",
      durationSeconds: 0,
    });
    await session.save();

    res.json({
      complete: false,
      questionIndex: answeredCount,
      transcribedAnswer: transcribedText,
      aiReaction,
      question: nextQuestion,
      totalQuestions: MAX_QUESTIONS,
    });
  } catch (err) {
    console.error("[/api/interview/next]", err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/interview/live-complete ───────────────────────────
// Finishes the live voice session, saves history, and generates evaluation
app.post("/api/interview/live-complete", async (req, res) => {
  try {
    const { sessionId, conversation } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId is required." });

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found." });

    const user = await User.findById(session.userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    // Group text logs into Question/Answer pairs for saving in MongoDB
    const chatHistory = [];
    let currentQuestion = "Introduction";
    let currentAnswer = "";

    if (Array.isArray(conversation)) {
      conversation.forEach((turn) => {
        if (turn.sender === "AI") {
          if (currentAnswer) {
            chatHistory.push({
              question: currentQuestion,
              transcribedAnswer: currentAnswer,
              aiReaction: "",
              durationSeconds: 20,
            });
            currentAnswer = "";
          }
          currentQuestion = turn.text;
        } else {
          currentAnswer += (currentAnswer ? " " : "") + turn.text;
        }
      });
    }

    if (currentQuestion || currentAnswer) {
      chatHistory.push({
        question: currentQuestion || "Closing",
        transcribedAnswer: currentAnswer || "(no answer)",
        aiReaction: "",
        durationSeconds: 20,
      });
    }

    session.chatHistory = chatHistory;

    // Run the evaluation pipeline
    let evaluation;
    try {
      const evalPrompt = buildEvaluationPrompt(user, chatHistory);
      const evalResult = await retryWithBackoff(async () => {
        return await geminiModel.generateContent(evalPrompt);
      });
      const evalText = evalResult.response.text();

      const cleaned = evalText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      evaluation = JSON.parse(cleaned);
    } catch (err) {
      console.warn("[Gemini Live Eval] Failed, fallback to mock:", err.message);
      evaluation = generateMockEvaluation(chatHistory);
    }

    session.finalEvaluation = evaluation;
    session.status = "completed";
    await session.save();

    res.json({
      success: true,
      evaluation,
    });
  } catch (err) {
    console.error("[/api/interview/live-complete]", err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/sessions/:id ───────────────────────────────────────
// Retrieve a completed session for the analytics dashboard
app.get("/api/sessions/:id", async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate("userId", "name email targetRole experienceLevel skillsKeywords");
    if (!session) return res.status(404).json({ error: "Session not found." });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════
// DATABASE CONNECTION & SERVER START
// ═════════════════════════════════════════════════════════════════
const { MongoMemoryServer } = require("mongodb-memory-server");
const http = require("http");
const WebSocket = require("ws");

const MONGODB_URI = process.env.MONGODB_URI || "";

// Wrap Express with HTTP Server
const server = http.createServer(app);

// Initialize WebSocket server attached to the upgraded paths
const wss = new WebSocket.Server({ noServer: true });

wss.on("connection", (ws, request) => {
  console.log("WebSocket client connected to live interview proxy");

  const urlParams = new URLSearchParams(request.url.split("?")[1]);
  const targetRole = urlParams.get("targetRole") || "Software Engineer";
  const experienceLevel = urlParams.get("experienceLevel") || "Mid-Level";
  const skillsKeywords = urlParams.get("skillsKeywords") || "general programming";

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY");
    ws.close(1011, "Missing GEMINI_API_KEY on server");
    return;
  }

  // Gemini Live WebSocket URL
  const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
  const geminiWs = new WebSocket(geminiUrl);

  const clientQueue = [];
  let geminiReady = false;

  geminiWs.on("open", () => {
    console.log("Connected to Gemini Live API");
    geminiReady = true;

    // Send initial configuration handshake
    const setupMsg = {
      setup: {
        model: "models/gemini-3.1-flash-live-preview",
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede" // Voice options: Aoede, Puck, Charon, Kore, Fenrir
              }
            }
          }
        },
        systemInstruction: {
          parts: [{
            text: [
              `You are a supportive, warm, senior technical and behavioral interviewer at a top tech company.`,
              `You are conducting a live mock interview with the candidate for the role of "${targetRole}" (${experienceLevel}).`,
              `Their target skills keywords are: ${skillsKeywords}.`,
              ``,
              `Flow Guidelines:`,
              `1. Warmly introduce yourself as the PrepIntellect interviewer, and ask the candidate to introduce themselves and their background.`,
              `2. Transition to a behavioral/HR question to check soft skills.`,
              `3. Ask a foundational technical concept matching their skills.`,
              `4. Ask an advanced problem-solving question or coding optimization.`,
              `5. Ask a system design or live troubleshooting scenario.`,
              `6. Conclude the session, tell them it went well, and thank them.`,
              ``,
              `Rules:`,
              `- Respond like a human interviewer. Acknowledge what they say naturally.`,
              `- Keep your responses short and punchy (under 2 sentences, under 40 words) so it feels like a real-time verbal conversation.`,
              `- Do not write code or long lists. Speak directly.`
            ].join("\n")
          }]
        },
        inputAudioTranscription: {}
      }
    };
    geminiWs.send(JSON.stringify(setupMsg));

    // Flush any queued client messages
    while (clientQueue.length > 0) {
      geminiWs.send(clientQueue.shift());
    }
  });

  geminiWs.on("message", (data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data.toString());
    }
  });

  geminiWs.on("close", (code, reason) => {
    console.log(`Gemini connection closed: ${code} - ${reason}`);
    ws.close(1000, "Gemini closed connection");
  });

  geminiWs.on("error", (err) => {
    console.error("Gemini WS Error:", err);
    ws.close(1011, "Error in Gemini connection");
  });

  ws.on("message", (message) => {
    if (geminiReady) {
      geminiWs.send(message);
    } else {
      clientQueue.push(message);
    }
  });

  ws.on("close", () => {
    console.log("Client closed live interview connection");
    geminiWs.close();
  });
});

// Upgrade handler to route /api/live-interview to WebSocket server
server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname === "/api/live-interview") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

async function startServer() {
  let uri = MONGODB_URI;

  if (uri) {
    try {
      console.log("⏳ Trying configured MongoDB URI…");
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      console.log("✅ MongoDB connected (Atlas / remote)");
    } catch (err) {
      console.warn("⚠️  Remote MongoDB failed:", err.message);
      console.log("🔄 Falling back to in-memory MongoDB…");
      await mongoose.disconnect().catch(() => {});
      uri = ""; // force fallback
    }
  }

  // Fallback: spin up mongodb-memory-server
  if (!uri || mongoose.connection.readyState !== 1) {
    const mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected (in-memory) —", uri);
    console.log("   ⚠️  Data will NOT persist across restarts.");
  }

  // Use http server listening instead of app.listen
  server.listen(PORT, () => {
    console.log(`🚀 PrepIntellect API running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("❌ Fatal startup error:", err);
  process.exit(1);
});
