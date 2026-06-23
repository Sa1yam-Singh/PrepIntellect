const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    targetRole: {
      type: String,
      default: "Software Engineer",
      trim: true,
    },
    experienceLevel: {
      type: String,
      default: "Mid-Level",
      trim: true,
    },
    category: {
      type: String,
      default: "Engineering",
      trim: true,
    },
    skillsKeywords: {
      type: [String],
      default: [],
    },
    organization: {
      type: String,
      default: "Personal",
      trim: true,
    },
    onboarding_complete: {
      type: Boolean,
      default: false,
    },
    timeline: {
      type: String,
      default: "",
      trim: true,
    },
    companyName: {
      type: String,
      default: "",
      trim: true,
    },
    savedQuestions: {
      type: [String],
      default: [],
    },
    xp: {
      type: Number,
      default: 0,
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastActiveDate: {
      type: Date,
      default: null,
    },
    lastWeeklyReportDate: {
      type: Date,
      default: null,
    },
    weeklyReportsSent: {
      type: Number,
      default: 0,
    },
    flashcards: {
      type: [
        new mongoose.Schema({
          question: String,
          answer: String,
          category: String,
          reviewCount: { type: Number, default: 0 },
        }, { _id: false })
      ],
      default: [],
    },
    availability: {
      type: [
        new mongoose.Schema({
          dayOfWeek: String,
          startTime: String,
          endTime: String,
        }, { _id: false })
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
