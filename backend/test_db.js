const mongoose = require('mongoose');
require('dotenv').config();

const Session = require("./models/Session");
const User = require("./models/User");

async function run() {
  const uri = process.env.MONGODB_URI;
  console.log("Connecting to:", uri);
  await mongoose.connect(uri);
  console.log("Connected.");

  const sessions = await Session.find()
    .sort({ createdAt: -1 })
    .limit(3)
    .populate("userId");

  console.log(`Found ${sessions.length} sessions.`);
  for (const session of sessions) {
    console.log("-----------------------------------------");
    console.log("Session ID:", session._id);
    console.log("User Email:", session.userId?.email || "No User");
    console.log("Status:", session.status);
    console.log("Created At:", session.createdAt);
    console.log("Evaluation:", JSON.stringify(session.finalEvaluation, null, 2));
    console.log("Chat History length:", session.chatHistory?.length);
    console.log("Chat History preview (first 2 Q&A):");
    session.chatHistory?.slice(0, 2).forEach((chat, i) => {
      console.log(`  Q${i+1}:`, chat.question);
      console.log(`  A${i+1}:`, chat.transcribedAnswer);
    });
  }

  await mongoose.disconnect();
}

run().catch(console.error);
