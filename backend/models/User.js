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
      enum: ["Intern", "Junior", "Mid-Level", "Senior", "Staff", "Principal"],
      default: "Mid-Level",
    },
    skillsKeywords: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
