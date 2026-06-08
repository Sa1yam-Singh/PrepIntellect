const mongoose = require("mongoose");

const chatEntrySchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
    },
    aiReaction: {
      type: String,
      default: "",
    },
    transcribedAnswer: {
      type: String,
      default: "",
    },
    audioUrl: {
      type: String,
      default: "",
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const infractionSchema = new mongoose.Schema(
  {
    infractionType: {
      type: String,
      required: true,
      enum: [
        "TAB_SWITCH",
        "WINDOW_BLUR",
        "COPY_PASTE",
        "RIGHT_CLICK",
        "DEVTOOLS",
        "CANDIDATE_ABSENT",
        "MULTIPLE_PEOPLE",
        "LOOK_AWAY",
        "BACKGROUND_NOISE",
      ],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    technicalScore: { type: Number, min: 0, max: 100, default: 0 },
    communicationScore: { type: Number, min: 0, max: 100, default: 0 },
    problemSolvingScore: { type: Number, min: 0, max: 100, default: 0 },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    grammarIssues: { type: [String], default: [] },
    perQuestionFeedback: { type: [String], default: [] },
    improvementTips: { type: [String], default: [] },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    chatHistory: {
      type: [chatEntrySchema],
      default: [],
    },
    cheatingInfractions: {
      type: [infractionSchema],
      default: [],
    },
    finalEvaluation: {
      type: evaluationSchema,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
