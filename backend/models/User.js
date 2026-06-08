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
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
