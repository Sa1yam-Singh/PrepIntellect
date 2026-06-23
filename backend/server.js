// ── PrepIntellect Backend Server ─────────────────────────────────
// Express + Mongoose + Gemini AI + OpenAI Whisper

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
const mammoth = require("mammoth");

const User = require("./models/User");
const Session = require("./models/Session");
const { sendStreakWarningEmail, sendWeeklyReportEmail } = require("./utils/emailService");

// ── Utility: Award XP and Update Daily Streak ───────────────────
async function awardXPAndStreak(user, amount) {
  if (!user) return;
  user.xp = (user.xp || 0) + amount;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!user.lastActiveDate) {
    user.streak = 1;
  } else {
    const lastActive = new Date(user.lastActiveDate);
    lastActive.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - lastActive.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      user.streak = (user.streak || 0) + 1;
    } else if (diffDays > 1) {
      user.streak = 1;
    }
    // If diffDays is 0 (same day), the streak remains active but does not increment twice
  }

  user.lastActiveDate = today;
  await user.save();
  return user;
}

// ── Configuration ───────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;
const MAX_QUESTIONS = 15;

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
const MOCK_QUESTIONS_BY_CATEGORY = {
  Engineering: [
    "Welcome to the interview! To start off, could you please introduce yourself, tell me about your background, and what roles you are preparing for?",
    "Tell me about a time you faced a difficult challenge or conflict during a previous technical project. What was the situation, and how did you resolve it?",
    "Can you describe a situation where you had to work under a tight deadline or handle a high-pressure launch? How did you prioritize your tasks?",
    "Describe a time when you took the initiative to improve a process, tool, or codebase without being explicitly asked. What was the outcome?",
    "Let's move on to programming language fundamentals. How does memory management or garbage collection work in your primary programming language?",
    "Can you explain the difference between a stack and a queue? In what scenarios would you choose one over the other?",
    "What is the average and worst-case time complexity of common operations in a hash map, and how does it handle collisions under the hood?",
    "Suppose you are given a massive log file containing millions of entries. How would you design an algorithm to find the top 10 most frequent IP addresses efficiently?",
    "How would you optimize that log parsing algorithm to run in a memory-constrained environment, say with only 10MB of RAM?",
    "Let's move to system design. How would you design a scalable URL shortening service like bit.ly? What are the key components?",
    "For the URL shortener system, how would you select and structure your databases? Would you use SQL or NoSQL, and how would you handle horizontal scaling?",
    "How would you handle security and rate limiting in your URL shortener service to prevent abuse or distributed denial of service attacks?",
    "Imagine a scenario where a production service suddenly experiences a 10x spike in response latency, but CPU usage remains low. What could be the cause, and how would you troubleshoot it?",
    "Based on your listed skills and keywords, what is one advanced feature or architectural pattern you've used in your past projects that you are particularly proud of?",
    "We are at the end of the interview. Do you have any questions for me, or is there anything else you'd like to highlight about your skills?",
  ],
  Medical: [
    "Welcome to your medical mock interview. To begin, could you introduce yourself, describe your clinical experience, and share your residency goals?",
    "Can you share an instance where you had to communicate difficult diagnostic news to a patient or their family? How did you manage it?",
    "Describe a high-pressure triage situation you've experienced in the ER or ICU. How did you make decisions under extreme stress?",
    "Tell me about a medical ethics or patient confidentiality dilemma you've encountered. What did you decide and why?",
    "Let's cover medical fundamentals. Can you explain the physiological mechanisms of the renin-angiotensin-aldosterone system (RAAS)?",
    "How do you approach history-taking for a patient presenting with acute abdominal pain? What key differentials do you keep in mind?",
    "Can you explain the primary side effects and drug-drug interactions of commonly prescribed anticoagulants?",
    "Clinical Case: A 62-year-old male presents with acute chest pain, radiating to the left arm, with ST-segment elevation on EKG. What is your differential diagnosis and immediate testing plan?",
    "For the previous ST-elevation MI case, what is your treatment plan, and how do you monitor the patient for post-infarct complications?",
    "In hospital systems, how do you approach a clinical audit for reducing surgical site infection rates?",
    "How does your clinical practice balance using Electronic Health Records (EHR) with ensuring HIPAA/patient data confidentiality?",
    "What are the key steps in designing a vaccine deployment campaign during a local influenza outbreak?",
    "Emergency Scenario: A patient in the ward suddenly exhibits severe dyspnea, stridor, and oxygen saturation drops to 78%. What are your immediate diagnostic and treatment steps?",
    "Given your medical specialties, what is an interesting clinical research topic or complex patient case you have worked on?",
    "We are at the end of the interview. Do you have any questions for the residency committee, or any final details to share?",
  ],
  Defense: [
    "Welcome to the SSB mock interview. To start off, please introduce yourself, state your educational background, and why you want to join the Armed Forces.",
    "SSB evaluates discipline. Can you tell me about a time you had to follow an order you disagreed with, or how you dealt with authority?",
    "SSB looks for moral and physical courage. Describe a situation where you had to handle fear or stand up for what was right under peer pressure.",
    "Tell me about a time you had to work with a challenging group or peer to complete an objective. How did you adapt?",
    "Let's test planning ability. Suppose you are leading a group of 5 students on a trek and one gets injured. How would you plan and organize the rescue?",
    "SSB values effective intelligence. How do you keep yourself updated with national security matters, and how do you apply this knowledge?",
    "SSB evaluates social warmth. How do you build trust with new teammates in a high-intensity training camp?",
    "SRT Scenario: You are traveling in a train and notice a suspicious package under the seat, and there is no cellular network. How would you react?",
    "SRT Scenario: During a mock military patrol, your radio communication goes down and you spot simulated hostile movement. What actions do you take?",
    "What is your assessment of the current geopolitical security dynamics in the Indo-Pacific region?",
    "How would you utilize Armed Forces resources for disaster relief and civilian evacuation during a major flood?",
    "How is the integration of modern technologies like drones, electronic warfare, and cybersecurity changing defense operations?",
    "Command Task: You are tasked to lead a team to bridge a 10-foot wide canal using only a wooden plank and a rope. How do you instruct your team?",
    "Can you explain the command structure of the Indian Armed Forces and the significance of joint military exercises?",
    "We are done. Do you have any questions for the board, or is there any aspect of your qualities you wish to elaborate on?",
  ],
  Aviation: [
    "Welcome to the cabin crew interview. Could you please introduce yourself, share your background, and why you want to pursue a career in aviation?",
    "Cabin crew requires service excellence. Describe a time you turned an unhappy customer or guest into a satisfied one. What did you do?",
    "Aviation rosters can be demanding. How do you manage fatigue, long flights, jet lag, and maintain energy on duty?",
    "Air hostesses must maintain pristine grooming. What does professional grooming and presentation mean to you in a safety-first role?",
    "Let's cover safety checks. What are the key items you inspect during pre-flight cabin security checks?",
    "Boarding is critical. How would you handle a passenger who refuses to store their oversized baggage in the overhead bin?",
    "Aviation service is structured. How do you ensure high-quality catering and beverage service on a short-haul flight with full passenger load?",
    "In-flight Medical: A passenger is experiencing chest tightness and difficulty breathing at 35,000 feet. What is your immediate protocol?",
    "Passenger Handling: An intoxicated passenger becomes loud and aggressive towards another passenger. How do you de-escalate the situation?",
    "Aviation safety: What are the cabin crew procedures in the event of sudden cabin decompression?",
    "Evacuation: In an emergency landing requiring evacuation, what verbal commands and protocols do you use to evacuate passengers via slides?",
    "Severe Turbulence: The captain turns on the seatbelt sign due to severe turbulence. What are your immediate actions for passenger and crew safety?",
    "Service Deficit: If you run out of pre-ordered vegetarian meals on a long flight, how would you resolve this passenger complaint?",
    "Hospitality: How do you customize service for first-class or VIP passengers while adhering to safety protocols?",
    "This concludes the cabin crew mock interview. Do you have any questions for the airline panel?",
  ],
};

const MOCK_REACTIONS = [
  "That's a solid foundation. You clearly understand the core concepts here.",
  "Interesting approach. Let me challenge you a bit more on this topic.",
  "Good thinking. I can see you have practical experience with this.",
  "I appreciate the structured way you broke that down. Let's go deeper.",
];

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith(".vercel.app");
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
}));

// Apply security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Handled on the frontend/hosting level
}));

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests from this IP, please try again after 15 minutes."
  }
});

// Apply rate limiting to all API endpoints
app.use("/api/", apiLimiter);

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Request logger — helps debug hanging requests
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Utility: Build Gemini System Prompt ─────────────────────────
function buildSystemPrompt(user) {
  let persona = "senior technical interviewer at a top-tier technology company";
  let skillsLabel = "key skills";
  
  if (user.category === "Medical") {
    persona = "senior medical chief examiner and clinical director at a premier hospital (such as AIIMS)";
    skillsLabel = "medical subjects and specialties";
  } else if (user.category === "Defense") {
    persona = "president and military psychologist of the Services Selection Board (SSB)";
    skillsLabel = "OLQs (Officer Like Qualities) and defense subjects";
  } else if (user.category === "Aviation") {
    persona = "senior cabin crew training director and flight operations evaluator at a leading global airline";
    skillsLabel = "aviation hospitality and safety skills";
  }

  return [
    `You are a ${persona}.`,
    `You are interviewing a candidate for the role/course of "${user.targetRole}".`,
    `The candidate's experience level or target track is "${user.experienceLevel}".`,
    `Their ${skillsLabel} include: ${user.skillsKeywords.join(", ") || "general subjects"}.`,
    ``,
    `Rules:`,
    `- Ask exactly ONE focused technical question at a time.`,
    `- Tailor questions to the candidate's role and listed skills.`,
    `- Start with a moderate difficulty question and progressively increase.`,
    `- Be concise — keep each question under 3 sentences.`,
    `- Do NOT provide the answer. Only ask the question.`,
  ].join("\n");
}

// ── Utility: Build Evaluation Prompt (Strict Accuracy) ──────────
function buildEvaluationPrompt(user, chatHistory) {
  const EMPTY_MARKERS = ["(no answer)", "(no answer provided)", "(no audio submitted)", "(transcription failed)"];
  const isEmptyAnswer = (ans) => !ans || ans.trim() === "" || EMPTY_MARKERS.includes(ans.trim()) || ans.trim().length < 15;

  const answeredCount = chatHistory.filter((e) => !isEmptyAnswer(e.transcribedAnswer)).length;
  const totalQuestions = Math.max(chatHistory.length, 15);
  const unansweredCount = totalQuestions - answeredCount;
  const answerRate = totalQuestions > 0 ? answeredCount / totalQuestions : 0;
  // Hard mathematical ceiling: can't score above your answer rate
  const maxPossibleScore = Math.max(5, Math.round(answerRate * 100));

  const transcript = chatHistory
    .map((entry, i) => {
      const isEmpty = isEmptyAnswer(entry.transcribedAnswer);
      return `Q${i + 1}: ${entry.question}\nA${i + 1}: ${isEmpty ? "⚠️ NO ANSWER PROVIDED — candidate was silent or skipped this question" : entry.transcribedAnswer}`;
    })
    .join("\n\n");

  return [
    `You are a STRICT and HONEST technical interview evaluator. Your job is to give ACCURATE scores — never inflate them.`,
    `You are evaluating a mock interview for the role of "${user.targetRole}" (${user.experienceLevel}).`,
    `Skills tested: ${user.skillsKeywords.join(", ") || "general"}.`,
    ``,
    `━━━ CRITICAL STATISTICS ━━━`,
    `• Total questions: ${totalQuestions}`,
    `• Questions answered: ${answeredCount}`,
    `• Questions SKIPPED / SILENT / EMPTY: ${unansweredCount}`,
    `• Answer rate: ${Math.round(answerRate * 100)}%`,
    `• MAXIMUM possible score (any category): ${maxPossibleScore}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `⛔ HARD RULE: No score in ANY category may exceed ${maxPossibleScore}. This is mathematically enforced because only ${answeredCount}/${totalQuestions} questions were answered. Exceeding this ceiling is FORBIDDEN.`,
    ``,
    `Here is the full interview transcript:`,
    `---`,
    transcript,
    `---`,
    ``,
    `SCORING SCALE — apply strictly:`,
    `  0-15  → Candidate barely participated (fewer than 2 real answers)`,
    `  16-35 → Very poor. Major gaps. Most questions unanswered or wrong.`,
    `  36-50 → Poor. Some engagement but significant knowledge gaps.`,
    `  51-65 → Below average. Partial answers, lacks depth or examples.`,
    `  66-75 → Average. Adequate answers but misses advanced concepts.`,
    `  76-88 → Good. Strong answers with good depth and structure.`,
    `  89-100 → Excellent. Near-perfect — only for exceptional candidates who answered nearly all questions with depth.`,
    ``,
    `Evaluate on these 3 criteria (strictly respect the scale and ceiling of ${maxPossibleScore}):`,
    `1. Technical Knowledge (0-${maxPossibleScore}): Accuracy/depth of technical content. Each unanswered question = 0 contribution.`,
    `2. Communication (0-${maxPossibleScore}): Clarity, structure, use of examples. Silent candidate cannot score above ${maxPossibleScore}.`,
    `3. Problem Solving (0-${maxPossibleScore}): Analytical approach, edge cases, methodical thinking.`,
    ``,
    `Produce a JSON evaluation — no markdown fences, pure JSON:`,
    `{`,
    `  "technicalScore": <integer 0-${maxPossibleScore}>,`,
    `  "communicationScore": <integer 0-${maxPossibleScore}>,`,
    `  "problemSolvingScore": <integer 0-${maxPossibleScore}>,`,
    `  "strengths": [<only list strengths with DIRECT EVIDENCE from the transcript — if candidate barely answered, strengths array may have only 1 item or be empty>],`,
    `  "weaknesses": ["<weakness 1 — name the specific question number and topic missed>", "<weakness 2>", "<weakness 3 — if ${unansweredCount} questions were skipped, this MUST be listed as a critical weakness>"],`,
    `  "grammarIssues": ["<grammar issue 1 if any>"],`,
    `  "perQuestionFeedback": [<one string per question — for unanswered questions write: "No answer provided — this question on [topic] was completely skipped">],`,
    `  "improvementTips": ["<tip 1 — must reference a SPECIFIC topic or question that was missed, e.g. 'Study hash map internals which was missed in Q6'>", "<tip 2>", "<tip 3>"]`,
    `}`,
    ``,
    `ENFORCEMENT:`,
    `- Scores ABOVE ${maxPossibleScore} are INVALID. Do not produce them.`,
    `- Do NOT fabricate strengths. Only write what the candidate actually demonstrated.`,
    `- Weaknesses MUST name specific topics/questions — not generic statements.`,
    `- Improvement tips must map to specific gaps in THIS interview, not generic advice.`,
    `- If ${unansweredCount} questions were skipped, the word "critical" must appear in weaknesses.`,
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

const CATEGORY_STAGES = {
  Engineering: [
    { stage: "INTRODUCTION & WELCOME", instruction: "Welcome the candidate warmly. Invite them to introduce themselves and discuss their background." },
    { stage: "BEHAVIORAL - TEAMWORK & CONFLICT", instruction: "Ask a behavioral question about handling conflict or different work styles in a team." },
    { stage: "BEHAVIORAL - PRESSURE & DEADLINES", instruction: "Ask a behavioral question about working under a tight deadline or handling a project that failed." },
    { stage: "BEHAVIORAL - LEADERSHIP & INITIATIVE", instruction: "Ask a behavioral question about showing initiative or leadership on a technical project." },
    { stage: "FOUNDATIONAL TECHNICAL - LANG MECHANICS & CONCURRENCY", instruction: "Ask a core question on runtime mechanics, memory management, or concurrency in their primary programming language." },
    { stage: "FOUNDATIONAL TECHNICAL - DATA STRUCTURES", instruction: "Ask a question about data structures (e.g., stack vs queue, hash map operations, tree structures)." },
    { stage: "FOUNDATIONAL TECHNICAL - ALGORITHMS", instruction: "Ask a question about core algorithms (e.g., sorting, searching, space/time complexity trade-offs)." },
    { stage: "ADVANCED ALGORITHMIC DESIGN", instruction: "Present a complex algorithmic problem-solving question related to the candidate's profile." },
    { stage: "CODING OPTIMIZATION & EDGE CASES", instruction: "Ask how they would optimize the previous algorithm for extreme constraints (e.g., memory limits, large datasets)." },
    { stage: "SYSTEM DESIGN - HIGH-LEVEL ARCHITECTURE", instruction: "Ask a high-level system design question (e.g., design a URL shortener, rate limiter, or messaging queue)." },
    { stage: "SYSTEM DESIGN - DATABASE & SCALABILITY", instruction: "Ask about database choices, sharding, replication, and handling database read/write scaling." },
    { stage: "SYSTEM DESIGN - FAULT TOLERANCE & SECURITY", instruction: "Ask about security, rate limiting, and ensuring fault tolerance during network partition." },
    { stage: "TROUBLESHOOTING & LIVE SCENARIO", instruction: "Present a hypothetical production outage scenario and ask how they would isolate and diagnose it." },
    { stage: "ROLE-SPECIFIC DEEP DIVE", instruction: "Ask an advanced technical question directly targeting their listed skills keywords." },
    { stage: "WRAP-UP & CLOSING", instruction: "Conclude the interview. Ask if they have questions for you. Thank them for their time." }
  ],
  Medical: [
    { stage: "MEDICAL INTRODUCTION & MOTIVATION", instruction: "Welcome the medical candidate warmly. Invite them to introduce themselves, their medical background, and residency aspirations." },
    { stage: "BEHAVIORAL - EMPATHY & PATIENT CARE", instruction: "Ask a behavioral question about demonstrating deep empathy or handling a difficult patient communication scenario." },
    { stage: "BEHAVIORAL - EMERGENCY HIGH-STRESS DECISIONS", instruction: "Ask a situational question about emergency triage, making a critical life-or-death decision under pressure." },
    { stage: "BEHAVIORAL - MEDICAL ETHICS & DISPUTES", instruction: "Ask a question about patient confidentiality, medical ethics, or resolving a dispute with a patient's family." },
    { stage: "MEDICAL FOUNDATIONS - ANATOMY & PHYSIOLOGY", instruction: "Ask a core foundational question on human anatomy or physiological mechanisms." },
    { stage: "MEDICAL FOUNDATIONS - DIAGNOSTIC REASONING", instruction: "Ask about their process for patient history-taking and developing differential diagnoses." },
    { stage: "MEDICAL FOUNDATIONS - PHARMACOLOGY & DRUG INTERACTIONS", instruction: "Ask about pharmacology, drug interactions, contraindications, or dosage calculations." },
    { stage: "CLINICAL CASE STUDY - PATIENT PRESENTATION", instruction: "Present a clinical symptom profile and ask them to discuss differential diagnoses and testing." },
    { stage: "CLINICAL CASE STUDY - TREATMENT PLANNING", instruction: "Ask them to outline a treatment plan, risk mitigation, and patient monitoring strategy for the case." },
    { stage: "MEDICAL SYSTEMS - HOSPITAL INFRASTRUCTURE", instruction: "Ask about clinical audit procedures, hospital hygiene, or public health guidelines." },
    { stage: "MEDICAL SYSTEMS - EHR & DATA SECURITY", instruction: "Ask about electronic health record (EHR) systems and maintaining patient data security/privacy." },
    { stage: "MEDICAL SYSTEMS - DISEASE PREVENTION & OUTBREAKS", instruction: "Ask about protocols for disease prevention, vaccine rollout, or outbreak containment." },
    { stage: "EMERGENCY SCENARIO - PATIENT DETERIORATION", instruction: "Present a scenario of a patient code-blue or trauma case and ask them to outline immediate interventions." },
    { stage: "ROLE-SPECIFIC MEDICAL SPECIALTY DEEP DIVE", instruction: "Ask an advanced clinical question related to their target specialty (e.g. AIIMS residency preference)." },
    { stage: "WRAP-UP & CLOSING", instruction: "Conclude the medical interview. Ask if they have questions. Thank them for their time." }
  ],
  Defense: [
    { stage: "DEFENSE INTRODUCTION & MOTIVATION", instruction: "Welcome the candidate warmly. Invite them to introduce themselves, their background, and their motivation to join the Armed Forces (NDA/CDS)." },
    { stage: "BEHAVIORAL - DISCIPLINE & AUTHORITY", instruction: "Ask a behavioral question about maintaining discipline, following orders, or dealing with authority." },
    { stage: "BEHAVIORAL - FEAR MANAGEMENT & GRIT", instruction: "Ask a question about handling fear, displaying physical/moral courage, and showing grit in adversity." },
    { stage: "BEHAVIORAL - SOCIAL ADAPTABILITY & TEAM", instruction: "Ask about social adaptability, peer relationships, and team cooperation in stressful environments." },
    { stage: "OLQ - PLANNING & REASONING ABILITY", instruction: "Ask a question to evaluate planning, organizing, and logical reasoning ability." },
    { stage: "OLQ - EFFECTIVE INTELLIGENCE & EXPRESSION", instruction: "Ask a question to evaluate effective intelligence and clarity of power of expression." },
    { stage: "OLQ - SOCIAL WARMTH & RESPONSIBILITY", instruction: "Ask a question evaluating social warmth, cooperation, and sense of duty/responsibility." },
    { stage: "SRT - CIVILIAN CRISIS SCENARIO", instruction: "Present a Situation Reaction Test: a sudden civilian emergency (e.g., natural disaster or accident) and ask how they would act." },
    { stage: "SRT - MILITARY TROOP SCENARIO", instruction: "Present a Situation Reaction Test: a troop/mission complication (e.g., lost communication, resource shortage) and ask for their plan." },
    { stage: "STRATEGIC KNOWLEDGE - GEOPOLITICS", instruction: "Ask about current global affairs, border security issues, or defense dynamics of the nation." },
    { stage: "STRATEGIC KNOWLEDGE - INTERNAL SECURITY", instruction: "Ask about internal security challenges, insurgency, or military disaster relief operations." },
    { stage: "STRATEGIC KNOWLEDGE - MODERN DEFENSE TECH", instruction: "Ask about modern warfare technologies such as militarized AI, drones, or cyber defense." },
    { stage: "COMMAND TASK - OBSTACLE & LEADERSHIP", instruction: "Present a hypothetical command task scenario (leading a group through an obstacle to rescue hostages or secure a zone) and ask how they lead." },
    { stage: "MILITARY AWARENESS - STRUCTURE & HISTORY", instruction: "Ask a question about armed forces structure, ranks, commands, or military history." },
    { stage: "WRAP-UP & CLOSING", instruction: "Conclude the SSB interview. Ask if they have questions for the panel. Thank them for their time." }
  ],
  Aviation: [
    { stage: "AVIATION INTRODUCTION & MOTIVATION", instruction: "Welcome the aviation candidate warmly. Invite them to introduce themselves, their background, and interest in joining the cabin crew." },
    { stage: "BEHAVIORAL - CUSTOMER SERVICE EXCELLENCE", instruction: "Ask a behavioral question about delivering service excellence or handling a very difficult passenger." },
    { stage: "BEHAVIORAL - STRESS & COPE ON FLIGHTS", instruction: "Ask a question about managing stress, fatigue, long shifts, and jet lag." },
    { stage: "BEHAVIORAL - CULTURAL SENSITIVITY & GROOMING", instruction: "Ask about maintaining high grooming standards and showing cultural sensitivity to international passengers." },
    { stage: "CABIN CREW DUTIES - SAFETY BRIEFINGS", instruction: "Ask a question about conducting pre-flight passenger briefings and cabin checks." },
    { stage: "CABIN CREW DUTIES - BOARDING & LUGGAGE", instruction: "Ask about handling passenger boarding, seating conflicts, and luggage storage problems." },
    { stage: "CABIN CREW DUTIES - IN-FLIGHT SERVICE", instruction: "Ask about food/beverage service standards, galley organization, and teamwork under time pressure." },
    { stage: "PASSENGER HANDLING - MEDICAL EMERGENCY", instruction: "Present an in-flight medical crisis (e.g., heart attack, panic attack, choking) and ask for their action plan." },
    { stage: "PASSENGER HANDLING - ANXIOUS/DISRUPTIVE PASSENGER", instruction: "Present a scenario of an anxious, claustrophobic, or disruptive/intoxicated passenger and ask how they manage them." },
    { stage: "AVIATION SYSTEMS - AIRCRAFT SAFETY GEAR", instruction: "Ask about aircraft safety equipment (e.g., oxygen masks, exits, slides, life rafts)." },
    { stage: "AVIATION SYSTEMS - EMERGENCY EVACUATION", instruction: "Ask about emergency cabin evacuation procedures (water landing or runway landing slide evacuation)." },
    { stage: "AVIATION SYSTEMS - WEATHER & DECOMPRESSION", instruction: "Ask about handling severe turbulence, cabin decompression, or smoke in the cabin." },
    { stage: "PROBLEM SOLVING - SERVICE DEFICIT", instruction: "Present a customer service problem (e.g., running out of vegetarian meals or business class seating issues) and ask for their resolution." },
    { stage: "SPECIALIZED HOSPITALITY - VIP CLIENTS", instruction: "Ask about serving VIP/first-class clients or handling complex luxury service requirements." },
    { stage: "WRAP-UP & CLOSING", instruction: "Conclude the aviation interview. Ask if they have questions. Thank them." }
  ]
};

// ── Utility: Generate Question via Gemini (with mock fallback) ──
async function generateQuestion(systemPrompt, previousQA, category = "Engineering") {
  const questionIndex = previousQA ? previousQA.length : 0;

  try {
    const parts = [{ text: systemPrompt }];

    const stages = CATEGORY_STAGES[category] || CATEGORY_STAGES.Engineering;
    const stageInfo = stages[questionIndex] || stages[stages.length - 1];
    const stagePrompt = `Stage: ${stageInfo.stage}\nInstruction: ${stageInfo.instruction}`;

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
    const categoryMockQuestions = MOCK_QUESTIONS_BY_CATEGORY[category] || MOCK_QUESTIONS_BY_CATEGORY.Engineering;
    return categoryMockQuestions[questionIndex % categoryMockQuestions.length];
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

// ── Utility: Generate Mock Evaluation (Strict Accuracy) ─────────
function generateMockEvaluation(chatHistory) {
  const EMPTY_MARKERS = ["(no answer)", "(no answer provided)", "(no audio submitted)", "(transcription failed)"];
  const isEmptyAnswer = (ans) => !ans || ans.trim() === "" || EMPTY_MARKERS.includes(ans.trim()) || ans.trim().length < 15;

  const answeredCount = chatHistory.filter((q) => !isEmptyAnswer(q.transcribedAnswer)).length;
  const totalQuestions = Math.max(chatHistory.length, 15);
  const unansweredCount = totalQuestions - answeredCount;
  const answerRate = totalQuestions > 0 ? answeredCount / totalQuestions : 0;
  // Hard ceiling — cannot score above your answer completion rate
  const maxScore = Math.max(5, Math.round(answerRate * 100));

  const avgLength = chatHistory
    .filter((q) => !isEmptyAnswer(q.transcribedAnswer))
    .reduce((sum, q) => sum + (q.transcribedAnswer?.length || 0), 0) / Math.max(answeredCount, 1);
  const depthBonus = Math.min(avgLength / 20, 8); // max 8pts bonus for long answers

  // Strict scoring — starts at 0, scales directly with answer rate
  const technicalScore    = Math.round(Math.min(answerRate * 80 + depthBonus + Math.random() * 5, maxScore));
  const communicationScore = Math.round(Math.min(answerRate * 75 + depthBonus * 0.8 + Math.random() * 5, maxScore));
  const problemSolvingScore = Math.round(Math.min(answerRate * 78 + depthBonus * 0.9 + Math.random() * 5, maxScore));

  // Identify which specific questions were skipped
  const skippedTopics = chatHistory
    .map((q, i) => ({ i, q }))
    .filter(({ q }) => isEmptyAnswer(q.transcribedAnswer))
    .map(({ q, i }) => `Q${i + 1} (${q.question.slice(0, 55).trim()}...)`);

  const strengths = answeredCount === 0
    ? ["Attended the interview session"]
    : [
        `Answered ${answeredCount} out of ${totalQuestions} questions`,
        avgLength > 200 ? "Provided detailed responses for the questions that were attempted" : "Kept responses focused for the questions attempted",
      ];

  const weaknesses = [
    unansweredCount > 0
      ? `CRITICAL: ${unansweredCount} out of ${totalQuestions} questions were completely unanswered — this is the primary reason for the low score`
      : "Could elaborate more with real-world examples and edge cases",
    skippedTopics.length > 0
      ? `Topics skipped without any answer: ${skippedTopics.slice(0, 3).join("; ")}`
      : "Practice breaking down complex problems step-by-step before answering",
    "Prepare structured answers using the STAR method (Situation, Task, Action, Result) for behavioral questions",
  ];

  const improvementTips = [
    skippedTopics.length > 0
      ? `Study and prepare answers for these skipped topics: ${skippedTopics.slice(0, 2).map((t) => t.replace(/Q\d+ \((.+)\.\.\.$/, "$1")).join(", ")}`
      : "Practice explaining technical concepts out loud to build verbal fluency",
    "Use the STAR method (Situation, Task, Action, Result) for behavioral questions to give structured answers",
    "For technical questions, always start by stating your approach before diving into details",
  ];

  return {
    technicalScore,
    communicationScore,
    problemSolvingScore,
    strengths,
    weaknesses,
    grammarIssues: [],
    perQuestionFeedback: chatHistory.map((q, i) => {
      if (isEmptyAnswer(q.transcribedAnswer)) {
        return `Q${i + 1}: ⚠️ No answer was provided — this question on "${q.question.slice(0, 60).trim()}" was completely skipped, contributing 0 to the score.`;
      }
      const len = q.transcribedAnswer.length;
      return `Q${i + 1}: Answer was ${len > 200 ? "detailed and thorough" : len > 80 ? "adequate but brief" : "very short"} — ${len > 200 ? "good depth shown" : "consider elaborating with specific examples and technical detail"}.`;
    }),
    improvementTips,
  };
}

// ── Utility: Enforce strict limits and formatting on evaluations ──
function enforceStrictEvaluation(evaluation, chatHistory) {
  if (!evaluation) return generateMockEvaluation(chatHistory);

  const EMPTY_MARKERS = ["(no answer)", "(no answer provided)", "(no audio submitted)", "(transcription failed)"];
  const isEmptyAnswer = (ans) => !ans || ans.trim() === "" || EMPTY_MARKERS.includes(ans.trim()) || ans.trim().length < 15;

  const answeredCount = chatHistory.filter((q) => !isEmptyAnswer(q.transcribedAnswer)).length;
  const totalQuestions = Math.max(chatHistory.length, 15);
  const unansweredCount = totalQuestions - answeredCount;
  const answerRate = totalQuestions > 0 ? answeredCount / totalQuestions : 0;
  
  // Hard ceiling logic
  const maxScore = Math.max(5, Math.round(answerRate * 100));

  // Enforce scores ceiling
  evaluation.technicalScore = Math.min(Number(evaluation.technicalScore) || 0, maxScore);
  evaluation.communicationScore = Math.min(Number(evaluation.communicationScore) || 0, maxScore);
  evaluation.problemSolvingScore = Math.min(Number(evaluation.problemSolvingScore) || 0, maxScore);

  // Format arrays if they don't exist
  if (!Array.isArray(evaluation.strengths)) evaluation.strengths = [];
  if (!Array.isArray(evaluation.weaknesses)) evaluation.weaknesses = [];
  if (!Array.isArray(evaluation.improvementTips)) evaluation.improvementTips = [];
  if (!Array.isArray(evaluation.grammarIssues)) evaluation.grammarIssues = [];
  if (!Array.isArray(evaluation.perQuestionFeedback)) evaluation.perQuestionFeedback = [];

  // Enforce realistic strengths and weaknesses based on answered questions
  if (answeredCount === 0) {
    evaluation.strengths = ["Attended the interview session"];
    evaluation.weaknesses = [
      `CRITICAL: All ${totalQuestions} questions were completely skipped or unanswered.`,
      "No technical knowledge or communication skills were demonstrated."
    ];
    evaluation.improvementTips = [
      "You must actively speak and answer the questions to receive an evaluation score.",
      "Ensure your microphone is connected and check the guardrail logs for detection errors."
    ];
  } else if (unansweredCount > 0) {
    // Inject critical warning if there are unanswered questions
    const warningMsg = `CRITICAL: ${unansweredCount} out of ${totalQuestions} questions were completely unanswered — this is the primary reason for the low score.`;
    if (!evaluation.weaknesses.some(w => w.includes("unanswered") || w.includes("completely skipped"))) {
      evaluation.weaknesses.unshift(warningMsg);
    }
  }

  // Ensure feedback lists missed questions
  const skippedTopics = chatHistory
    .map((q, i) => ({ i, q }))
    .filter(({ q }) => isEmptyAnswer(q.transcribedAnswer))
    .map(({ q, i }) => `Q${i + 1} (${q.question.slice(0, 55).trim()}...)`);

  if (skippedTopics.length > 0) {
    const skippedWarning = `Topics skipped without any answer: ${skippedTopics.slice(0, 3).join("; ")}`;
    if (!evaluation.weaknesses.some(w => w.includes("Topics skipped"))) {
      evaluation.weaknesses.push(skippedWarning);
    }
  }

  return evaluation;
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
    const { 
      name, 
      email, 
      targetRole, 
      experienceLevel, 
      skillsKeywords, 
      organization, 
      category,
      onboarding_complete,
      timeline,
      companyName
    } = req.body;
    
    // Find existing user by email
    let user = await User.findOne({ email });
    if (user) {
      user.name = name || user.name;
      user.targetRole = targetRole !== undefined ? targetRole : user.targetRole;
      user.experienceLevel = experienceLevel !== undefined ? experienceLevel : user.experienceLevel;
      user.skillsKeywords = skillsKeywords !== undefined ? skillsKeywords : user.skillsKeywords;
      user.organization = organization !== undefined ? organization : user.organization;
      user.category = category !== undefined ? category : user.category;
      if (onboarding_complete !== undefined) user.onboarding_complete = onboarding_complete;
      if (timeline !== undefined) user.timeline = timeline;
      if (companyName !== undefined) user.companyName = companyName;
      await user.save();
      return res.status(200).json(user);
    }

    user = await User.create({
      name,
      email,
      targetRole,
      experienceLevel,
      skillsKeywords,
      organization: organization || "Personal",
      category: category || "Engineering",
      onboarding_complete: onboarding_complete || false,
      timeline: timeline || "",
      companyName: companyName || "",
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/users/onboarding ──────────────────────────────────
app.post("/api/users/onboarding", async (req, res) => {
  try {
    const { email, targetRole, experienceLevel, timeline, companyName } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    user.targetRole = targetRole || user.targetRole;
    user.experienceLevel = experienceLevel || user.experienceLevel;
    user.timeline = timeline || user.timeline;
    user.companyName = companyName || user.companyName;
    user.onboarding_complete = true;
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users/:email ───────────────────────────────────────
app.get("/api/users/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json(user);
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
        xp: 0,
        rank: 1,
      });
    }

    const sessions = await Session.find({ userId: user._id, status: "completed" })
      .sort({ createdAt: -1 })
      .lean();

    const totalSessions = sessions.length;

    // Rank calculation: count users in the same category with more XP + 1
    const rank = await User.countDocuments({
      category: user.category,
      xp: { $gt: user.xp || 0 }
    }) + 1;

    if (totalSessions === 0) {
      return res.json({
        totalSessions: 0,
        avgTechnicalScore: 0,
        avgCommunicationScore: 0,
        avgProblemSolvingScore: 0,
        lastSessionDate: null,
        currentStreak: user.streak || 0,
        xp: user.xp || 0,
        rank: rank,
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
      currentStreak: user.streak || currentStreak || 0,
      xp: user.xp || 0,
      rank: rank,
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
    const question = await generateQuestion(systemPrompt, [], user.category);

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

      evaluation = enforceStrictEvaluation(evaluation, session.chatHistory);
      session.finalEvaluation = evaluation;
      session.status = "completed";
      await session.save();

      if (user) {
        await awardXPAndStreak(user, 100);
      }

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
      generateQuestion(systemPrompt, session.chatHistory, user.category)
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
    const { sessionId, conversation, infractions } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId is required." });

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found." });

    const user = await User.findById(session.userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    // Group text logs into Question/Answer pairs for saving in MongoDB
    const chatHistory = [];
    let currentQuestion = "Introduction";
    let currentAnswer = "";

    // Track timestamps for accurate duration calculation
    let lastTimestamp = session.createdAt ? new Date(session.createdAt).getTime() : Date.now();

    if (Array.isArray(conversation)) {
      conversation.forEach((turn) => {
        const turnTime = turn.timestamp ? new Date(turn.timestamp).getTime() : Date.now();
        if (turn.sender === "AI") {
          if (currentAnswer) {
            const duration = Math.max(5, Math.round((turnTime - lastTimestamp) / 1000));
            chatHistory.push({
              question: currentQuestion,
              transcribedAnswer: currentAnswer,
              aiReaction: "",
              durationSeconds: duration,
            });
            currentAnswer = "";
          }
          currentQuestion = turn.text;
          lastTimestamp = turnTime;
        } else {
          currentAnswer += (currentAnswer ? " " : "") + turn.text;
        }
      });
    }

    if (currentQuestion || currentAnswer) {
      const endTime = Date.now();
      const duration = Math.max(5, Math.round((endTime - lastTimestamp) / 1000));
      chatHistory.push({
        question: currentQuestion || "Closing",
        transcribedAnswer: currentAnswer || "(no answer)",
        aiReaction: "",
        durationSeconds: duration,
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

    evaluation = enforceStrictEvaluation(evaluation, chatHistory);
    session.finalEvaluation = evaluation;
    session.status = "completed";
    await session.save();

    if (user) {
      await awardXPAndStreak(user, 100);
    }

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

// ── Question Bank Mock Database ─────────────────────────────────
const QUESTION_BANK = [
  { id: "q1", question: "Describe a time when you had to deal with a difficult teammate. How did you handle the situation?", category: "Behavioral", role: "All Roles", difficulty: "Easy", company: "Amazon" },
  { id: "q2", question: "Why do you want to join this company, and what unique value do you bring to our team?", category: "Behavioral", role: "All Roles", difficulty: "Easy", company: "Google" },
  { id: "q3", question: "Tell me about a time you made a mistake on a project. What did you learn and how did you resolve it?", category: "Behavioral", role: "All Roles", difficulty: "Medium", company: "Meta" },
  { id: "q4", question: "How do you explain a complex technical concept to a non-technical stakeholder?", category: "Behavioral", role: "All Roles", difficulty: "Medium", company: "Microsoft" },
  { id: "q5", question: "Describe a situation where you went above and beyond your core responsibilities. What was the impact?", category: "Behavioral", role: "All Roles", difficulty: "Medium", company: "Netflix" },
  { id: "q6", question: "Tell me about a time you had to make a decision without all the information you needed. What was the outcome?", category: "Behavioral", role: "All Roles", difficulty: "Hard", company: "Stripe" },
  
  { id: "q7", question: "What is the difference between processes and threads, and how do they share resources?", category: "Technical", role: "SWE", difficulty: "Medium", company: "Google" },
  { id: "q8", question: "How do you optimize a SQL query that is running slowly on a table with millions of rows?", category: "Technical", role: "Data", difficulty: "Medium", company: "Uber" },
  { id: "q9", question: "Explain the virtual DOM in React and why it makes UI updates more efficient.", category: "Technical", role: "SWE", difficulty: "Easy", company: "Meta" },
  { id: "q10", question: "How does HTTPS establish a secure connection? Explain the SSL/TLS handshake process.", category: "Technical", role: "SWE", difficulty: "Medium", company: "Cloudflare" },
  { id: "q11", question: "What are the differences between supervised and unsupervised learning? When would you use each?", category: "Technical", role: "Data", difficulty: "Easy", company: "Apple" },
  { id: "q12", question: "What is horizontal scaling versus vertical scaling, and how do you design a database for horizontal scaling?", category: "Technical", role: "SWE", difficulty: "Hard", company: "AWS" },

  { id: "q13", question: "How would you design a scalable notification service like WhatsApp or Twitter notifications?", category: "Role-specific", role: "SWE", difficulty: "Hard", company: "Meta" },
  { id: "q14", question: "How would you prioritize the roadmap for an e-commerce checkout flow with declining conversion rates?", category: "Role-specific", role: "PM", difficulty: "Hard", company: "Amazon" },
  { id: "q15", question: "How do you design a data pipeline to ingest 1TB of user clickstream logs daily in real-time?", category: "Role-specific", role: "Data", difficulty: "Hard", company: "Netflix" },
  { id: "q16", question: "Walk me through your design process for a mobile banking dashboard aimed at elderly users.", category: "Role-specific", role: "Design", difficulty: "Medium", company: "Stripe" },
  { id: "q17", question: "How do you estimate the market size for ride-sharing services in a new city?", category: "Role-specific", role: "PM", difficulty: "Hard", company: "Uber" },
  { id: "q18", question: "Design the user profile screen for a premium mock interview application. What elements do you prioritize?", category: "Role-specific", role: "Design", difficulty: "Easy", company: "Airbnb" },
];

// ── POST /api/resume/upload ─────────────────────────────────────
// Uploads and parses a resume document (PDF, DOCX, or TXT), extracts skills and generates 15 questions
app.post("/api/resume/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No resume file provided." });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    let text = "";

    if (ext === ".txt") {
      text = fs.readFileSync(req.file.path, "utf8");
    } else if (ext === ".pdf") {
      const dataBuffer = fs.readFileSync(req.file.path);
      const parsed = await pdfParse(dataBuffer);
      text = parsed.text;
    } else if (ext === ".docx") {
      const parsed = await mammoth.extractRawText({ path: req.file.path });
      text = parsed.value;
    } else {
      return res.status(400).json({ error: "Unsupported file type. Use PDF, DOCX, or TXT." });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Resume file content is empty." });
    }

    // Call Gemini/OpenAI API to extract skills, generate questions, and analyze resume
    const systemPrompt = "You are an expert technical interviewer and resume parser.";
    const resumePrompt = `
Parse the following resume text.
1. Extract a list of up to 10 key technical and soft skills/keywords found in the resume.
2. Generate exactly 15 personalized interview questions tailored to their background, divided into:
   - 5 Behavioral questions (STAR format related to projects or experience on their resume)
   - 5 Technical questions (fundamental and advanced topics based on their tech stack)
   - 5 Role-specific questions (scenario-based or specialized questions based on their target track)
3. Analyze the resume and provide a detailed analysis report:
   - score: Overall resume rating on a scale of 0 to 100.
   - summary: A brief summary of the resume's overall quality and professional impact.
   - strengths: A list of 3-4 key strengths observed.
   - improvements: A list of 3-4 specific areas for improvement.
   - atsCompatibility: An object evaluating fileFormat, keywordDensity, headingStructure, and contactInfo.
   - sections: An array of section evaluations (e.g. Experience, Projects, Education, Skills) with ratings ("Excellent", "Good", "Needs Improvement") and details.

Format your response as a JSON object with EXACTLY this structure (no markdown fences, pure JSON):
{
  "skills": ["Skill 1", "Skill 2", ...],
  "questions": {
    "behavioral": ["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"],
    "technical": ["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"],
    "roleSpecific": ["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"]
  },
  "analysis": {
    "score": 85,
    "summary": "Overall resume summary...",
    "strengths": ["Strength 1", "Strength 2", ...],
    "improvements": ["Improvement 1", "Improvement 2", ...],
    "atsCompatibility": {
      "fileFormat": "Good",
      "keywordDensity": "Good",
      "headingStructure": "Good",
      "contactInfo": "Good"
    },
    "sections": [
      { "name": "Experience", "rating": "Good", "details": "Feedback..." },
      { "name": "Projects", "rating": "Needs Improvement", "details": "Feedback..." }
    ]
  }
}

Resume Text:
${text}
`;

    let jsonResult = null;
    let resultText = "";
    let lastError = null;

    // Try Anthropic Claude first if configured
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        console.log("[Resume Analysis] Contacting Anthropic Claude API...");
        const response = await retryWithBackoff(async () => {
          const message = await anthropic.messages.create({
            model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
            max_tokens: 4000,
            system: systemPrompt,
            messages: [
              { role: "user", content: resumePrompt }
            ]
          });
          return message.content[0].text;
        });
        resultText = response;
        console.log("[Resume Analysis] Anthropic Claude call succeeded.");
      } catch (err) {
        console.error("Anthropic Claude failed, falling back to Gemini:", err.message);
        lastError = err;
      }
    }

    // Fallback to Google Gemini
    if (!resultText) {
      try {
        console.log("[Resume Analysis] Contacting Google Gemini API...");
        const response = await retryWithBackoff(async () => {
          const resVal = await geminiModel.generateContent(`${systemPrompt}\n${resumePrompt}`);
          return resVal.response.text();
        });
        resultText = response;
        console.log("[Resume Analysis] Google Gemini call succeeded.");
      } catch (err) {
        console.error("Google Gemini failed:", err.message);
        lastError = err;
      }
    }

    if (!resultText) {
      throw new Error(`AI Resume Analysis failed. Both Anthropic and Gemini APIs are currently unavailable. Details: ${lastError?.message || "Unknown error"}`);
    }

    try {
      const cleaned = resultText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      jsonResult = JSON.parse(cleaned);
    } catch (err) {
      console.error("Failed to parse AI JSON response:", err.message);
      throw new Error(`The AI returned an invalid or unparseable JSON response structure. Detailed error: ${err.message}`);
    }

    res.json(jsonResult);
  } catch (err) {
    console.error("Error in /api/resume/upload", err);
    res.status(500).json({ error: err.message });
  } finally {
    // Delete temp file
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
  }
});

// ── GET /api/questions/bank ─────────────────────────────────────
// Retrieve all question bank entries
app.get("/api/questions/bank", (_req, res) => {
  res.json(QUESTION_BANK);
});

// ── POST /api/questions/save ────────────────────────────────────
// Toggles saved status of a question for a user
app.post("/api/questions/save", async (req, res) => {
  try {
    const { email, questionId } = req.body;
    if (!email || !questionId) {
      return res.status(400).json({ error: "email and questionId are required." });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found." });

    const isSaved = user.savedQuestions.includes(questionId);
    if (isSaved) {
      user.savedQuestions = user.savedQuestions.filter(id => id !== questionId);
    } else {
      user.savedQuestions.push(questionId);
    }
    await user.save();
    res.json({ savedQuestions: user.savedQuestions, isSaved: !isSaved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/practice/score ────────────────────────────────────
// Scores a single practice answer across 5 dimensions using Gemini
app.post("/api/practice/score", async (req, res) => {
  try {
    const { question, answer, email } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: "question and answer are required." });
    }

    const systemPrompt = "You are an expert interview evaluator specializing in communications, behavioral answers, and technical correctness.";
    const scoringPrompt = `
Evaluate the candidate's answer to the following question.
Question: "${question}"
Answer: "${answer}"

Provide a detailed evaluation across these 5 dimensions:
1. Structure (coherence, flow, format like STAR)
2. Relevance (directly answering the prompt)
3. Specificity (use of concrete metrics, examples, tools)
4. Clarity (unambiguous, professional language)
5. Impact (demonstrating results, outcomes, or deep understanding)

For each dimension, provide:
- A score from 1 to 10
- A one-line detailed comment (under 15 words) explaining the score.

Also calculate an overall average score (the average of the 5 scores multiplied by 10, or out of 100), and provide 2-3 specific, actionable suggestions for improvement.

Format your response as a JSON object with EXACTLY this structure (no markdown fences, pure JSON):
{
  "overallScore": <0-100>,
  "dimensions": {
    "structure": { "score": <1-10>, "comment": "<one line comment>" },
    "relevance": { "score": <1-10>, "comment": "<one line comment>" },
    "specificity": { "score": <1-10>, "comment": "<one line comment>" },
    "clarity": { "score": <1-10>, "comment": "<one line comment>" },
    "impact": { "score": <1-10>, "comment": "<one line comment>" }
  },
  "suggestions": [
    "<suggestion 1>",
    "<suggestion 2>",
    "<suggestion 3>"
  ]
}
`;

    const result = await retryWithBackoff(async () => {
      const resVal = await geminiModel.generateContent(`${systemPrompt}\n${scoringPrompt}`);
      return resVal.response.text();
    });

    let jsonResult;
    try {
      const cleaned = result.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      jsonResult = JSON.parse(cleaned);
    } catch (err) {
      console.error("Failed to parse Gemini practice score response, fallback to mock data", err);
      jsonResult = {
        overallScore: 68,
        dimensions: {
          structure: { score: 7, comment: "Structure is logical but could use clearer STAR sequencing." },
          relevance: { score: 8, comment: "Directly addresses the question but strays slightly at the end." },
          specificity: { score: 6, comment: "Lacks concrete metrics or details about tools used." },
          clarity: { score: 7, comment: "Language is clear but sentences are slightly run-on." },
          impact: { score: 6, comment: "Outcome is mentioned but not quantified." }
        },
        suggestions: [
          "Structure your answer more clearly around Situation, Task, Action, and Result (STAR).",
          "Include concrete numbers, e.g., 'reduced latency by 40%' instead of just 'improved latency'.",
          "Avoid filler phrasing at the end and conclude with a strong summary statement."
        ]
      };
    }

    let xpAwarded = 0;
    if (email) {
      const user = await User.findOne({ email });
      if (user) {
        await awardXPAndStreak(user, 30);
        xpAwarded = 30;
      }
    }

    res.json({ ...jsonResult, xpAwarded });
  } catch (err) {
    console.error("Error in /api/practice/score", err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/practice/hint ─────────────────────────────────────
// Generates a conceptual hint for a practice question using Gemini
app.post("/api/practice/hint", async (req, res) => {
  try {
    const { question, code, language } = req.body;
    if (!question) {
      return res.status(400).json({ error: "question is required." });
    }

    const systemPrompt = "You are an expert coding interview coach.";
    const hintPrompt = `
The candidate is practicing a technical coding question.
Question: "${question}"
${code ? `Their current code in ${language || "plain text"}:\n\`\`\`\n${code}\n\`\`\`` : "They haven't written any code yet."}

Provide a helpful, progressive conceptual hint to guide them toward the optimal solution.
- Focus on the high-level logic, algorithmic strategy (e.g. dynamic programming, sliding window), or data structures.
- Do NOT write or provide complete code solutions.
- Keep the hint brief (under 3 sentences) and highly actionable.
`;

    const result = await retryWithBackoff(async () => {
      const resVal = await geminiModel.generateContent(`${systemPrompt}\n${hintPrompt}`);
      return resVal.response.text();
    });

    res.json({ hint: result.trim() });
  } catch (err) {
    console.error("Error in /api/practice/hint", err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/practice/score-code ───────────────────────────────
// Scores a coding solution across correctness, complexity and style
app.post("/api/practice/score-code", async (req, res) => {
  try {
    const { question, code, language, email } = req.body;
    if (!question || !code) {
      return res.status(400).json({ error: "question and code are required." });
    }

    const systemPrompt = "You are an expert technical interviewer specializing in SDE coding rounds.";
    const codingPrompt = `
Evaluate the candidate's code solution to the following question.
Question: "${question}"
Programming Language: ${language || "JavaScript"}
Code:
\`\`\`${language || "javascript"}
${code}
\`\`\`

Evaluate the code on these dimensions:
1. Correctness (logic, edge cases, standard constraints)
2. Time Complexity (does it meet optimal scaling?)
3. Space Complexity (is the memory footprint minimized?)
4. Readability (variable naming, modularity, comments)
5. Optimal Approach (how close to the best known algorithm?)

Provide a detailed time complexity (e.g. O(N), O(log N)) and space complexity.
Also calculate an overall average score (out of 100), and provide 2-3 specific, actionable suggestions.

Format your response as a JSON object with EXACTLY this structure (no markdown fences, pure JSON):
{
  "overallScore": <0-100>,
  "complexityAnalysis": {
    "time": "<e.g., O(N) or O(N log N)>",
    "space": "<e.g., O(1) or O(N)>",
    "explanation": "<brief 1-2 sentence explanation of time/space complexity>"
  },
  "dimensions": {
    "correctness": { "score": <1-10>, "comment": "<one line comment>" },
    "timeComplexity": { "score": <1-10>, "comment": "<one line comment>" },
    "spaceComplexity": { "score": <1-10>, "comment": "<one line comment>" },
    "readability": { "score": <1-10>, "comment": "<one line comment>" },
    "optimalApproach": { "score": <1-10>, "comment": "<one line comment>" }
  },
  "suggestions": [
    "<suggestion 1>",
    "<suggestion 2>",
    "<suggestion 3>"
  ]
}
`;

    const result = await retryWithBackoff(async () => {
      const resVal = await geminiModel.generateContent(`${systemPrompt}\n${codingPrompt}`);
      return resVal.response.text();
    });

    let jsonResult;
    try {
      const cleaned = result.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      jsonResult = JSON.parse(cleaned);
    } catch (err) {
      console.error("Failed to parse Gemini code score response, fallback to mock data", err);
      jsonResult = {
        overallScore: 78,
        complexityAnalysis: {
          time: "O(N log N)",
          space: "O(N)",
          explanation: "Sorting the array takes O(N log N) time. The auxiliary storage holds a copy of unique elements."
        },
        dimensions: {
          correctness: { score: 8, comment: "Solution passes standard test cases but lacks boundary checks." },
          timeComplexity: { score: 7, comment: "Sorting is correct but can be optimized to linear time." },
          spaceComplexity: { score: 8, comment: "Memory footprint is reasonable but auxiliary array can be skipped." },
          readability: { score: 9, comment: "Excellent variable naming and modular block layout." },
          optimalApproach: { score: 7, comment: "A hash map approach could yield O(N) time complexity." }
        },
        suggestions: [
          "Check for empty array input boundary conditions.",
          "Try utilizing a Hash Map to avoid sorting overhead and reduce complexity to O(N).",
          "Ensure variable types are handled correctly for large integer inputs."
        ]
      };
    }

    let xpAwarded = 0;
    if (email) {
      const user = await User.findOne({ email });
      if (user) {
        await awardXPAndStreak(user, 30);
        xpAwarded = 30;
      }
    }

    res.json({ ...jsonResult, xpAwarded });
  } catch (err) {
    console.error("Error in /api/practice/score-code", err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/leaderboard ─────────────────────────────────────────
// Fetch top users sorted by XP (overall or by category)
app.get("/api/leaderboard", async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category && category !== "All" ? { category } : {};
    
    const leaders = await User.find(filter)
      .sort({ xp: -1 })
      .limit(10)
      .select("name email xp streak category targetRole")
      .lean();
      
    res.json(leaders);
  } catch (err) {
    console.error("Error in /api/leaderboard", err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/trigger-emails ──────────────────────────────
// Manually triggers a mock retention email for testing
app.post("/api/admin/trigger-emails", async (req, res) => {
  try {
    const { email, type } = req.body;
    if (!email) {
      return res.status(400).json({ error: "email is required." });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (type === "streak") {
      const emailRes = await sendStreakWarningEmail(user);
      return res.json({ success: true, message: "Streak warning email triggered.", details: emailRes });
    } else if (type === "weekly") {
      const sessions = await Session.find({ userId: user._id, status: "completed" }).lean();
      const stats = {
        avgTechnicalScore: 78,
        avgCommunicationScore: 82,
        avgProblemSolvingScore: 80,
      };
      const emailRes = await sendWeeklyReportEmail(user, stats, sessions);
      return res.json({ success: true, message: "Weekly report email triggered.", details: emailRes });
    } else {
      return res.status(400).json({ error: "Invalid type. Use 'streak' or 'weekly'." });
    }
  } catch (err) {
    console.error("Error in /api/admin/trigger-emails", err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/sessions/public/:id ────────────────────────────────
// Retrieve a completed session without email authorization (Public Read-Only)
app.get("/api/sessions/public/:id", async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate("userId", "name targetRole experienceLevel skillsKeywords");
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
  const category = urlParams.get("category") || "Engineering";

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
              `You are a supportive, warm, ${(() => {
                if (category === "Medical") {
                  return "senior medical chief examiner and clinical director at a premier hospital (such as AIIMS)";
                } else if (category === "Defense") {
                  return "Services Selection Board (SSB) president and military interviewer";
                } else if (category === "Aviation") {
                  return "senior cabin crew flight trainer and aviation hospitality evaluator";
                }
                return "senior technical and behavioral interviewer at a top tech company";
              })()}.`,
              `You are conducting a live mock interview with the candidate for the role/course of "${targetRole}" (${experienceLevel}).`,
              `Their target ${category === "Engineering" ? "skills keywords" : category === "Medical" ? "subjects and specialties" : category === "Defense" ? "OLQs (Officer Like Qualities) and training areas" : "aviation service and safety skills"} are: ${skillsKeywords}.`,
              ``,
              `Flow Guidelines:`,
              `You must pace the interview to last at least 10 minutes and ask at least 12-15 questions in total before concluding. Ask exactly one question at a time and wait for the candidate's response before moving to the next.`,
              `Structure the interview across these stages:`,
              ...(CATEGORY_STAGES[category] || CATEGORY_STAGES.Engineering).map((s, idx) => `${idx + 1}. ${s.stage}: ${s.instruction} (1 question)`),
              ``,
              `Rules:`,
              `- You MUST ask at least 12-15 questions. Do NOT skip any stages or wrap up early.`,
              `- Maintain a professional, encouraging, yet rigorous tone.`,
              `- Respond like a human interviewer: acknowledge their answer naturally with a brief comment before moving to the next question.`,
              `- Keep your responses short and punchy (under 2 sentences, under 45 words) to ensure a fluid real-time conversation.`,
              `- Do not write code blocks, lists, or long explanations. Talk directly.`
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

async function seedLeaderboard() {
  try {
    const count = await User.countDocuments();
    if (count <= 1) {
      console.log("🌱 Seeding mock users for leaderboard...");
      const mockUsers = [
        { name: "Siddharth Verma", email: "siddharth@example.com", xp: 1250, streak: 8, category: "Engineering", targetRole: "Senior Backend Engineer", onboarding_complete: true },
        { name: "Priya Sharma", email: "priya@example.com", xp: 950, streak: 5, category: "Engineering", targetRole: "Full Stack Engineer", onboarding_complete: true },
        { name: "Arjun Mehta", email: "arjun@example.com", xp: 820, streak: 4, category: "Engineering", targetRole: "Frontend Developer", onboarding_complete: true },
        { name: "Dr. Ananya Roy", email: "ananya@example.com", xp: 1100, streak: 6, category: "Medical", targetRole: "Resident Cardiologist", onboarding_complete: true },
        { name: "Dr. Kabir Malhotra", email: "kabir@example.com", xp: 750, streak: 3, category: "Medical", targetRole: "General Surgeon", onboarding_complete: true },
        { name: "Vikram Rathore", email: "vikram@example.com", xp: 1050, streak: 7, category: "Defense", targetRole: "SSB Cadet Officer", onboarding_complete: true },
        { name: "Rohan Singhal", email: "rohan@example.com", xp: 620, streak: 2, category: "Aviation", targetRole: "Trainee Cabin Crew", onboarding_complete: true },
      ];
      await User.insertMany(mockUsers);
      console.log("✅ Leaderboard seeding complete.");
    }
  } catch (err) {
    console.warn("⚠️ Mock seeding failed:", err.message);
  }
}

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
      await seedLeaderboard();
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
    await seedLeaderboard();
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
