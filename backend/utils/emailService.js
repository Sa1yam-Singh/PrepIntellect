const nodemailer = require("nodemailer");

// Initialize transporter dynamically based on env vars
function getTransporter() {
  const host = process.env.EMAIL_HOST || (process.env.RESEND_API_KEY ? "smtp.resend.com" : null);
  const user = process.env.EMAIL_USER || (process.env.RESEND_API_KEY ? "resend" : null);
  const pass = process.env.EMAIL_PASS || process.env.RESEND_API_KEY || null;
  const port = parseInt(process.env.EMAIL_PORT, 10) || 465;

  if (user && pass) {
    return nodemailer.createTransport({
      host: host || "smtp.resend.com",
      port: port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user: user,
        pass: pass,
      },
    });
  }
  return null;
}

/**
 * Main email dispatcher
 */
async function sendEmail({ to, subject, html }) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || "PrepIntellect <onboarding@resend.dev>";

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: from,
        to: to,
        subject: subject,
        html: html,
      });
      console.log(`[Email Service] Email sent successfully: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error("[Email Service] Failed to send email via SMTP:", err.message);
      return { success: false, error: err.message };
    }
  } else {
    // Development Console Log fallback (extremely useful for demo and debugging)
    console.log("\n==================================================");
    console.log(`📩  [DEV EMAIL LOG]`);
    console.log(`TO:      ${to}`);
    console.log(`FROM:    ${from}`);
    console.log(`SUBJECT: ${subject}`);
    console.log("--------------------------------------------------");
    // Simple text version preview from HTML
    const plainText = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 300) + "...";
    console.log(`BODY (Excerpt): ${plainText}`);
    console.log("==================================================\n");
    return { success: true, devMode: true };
  }
}

/**
 * Send warning email for 3 days inactivity
 */
async function sendStreakWarningEmail(user) {
  const streak = user.streak || 0;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 40px 20px; text-align: center; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid rgba(99, 102, 241, 0.2);">
      <div style="margin-bottom: 24px;">
        <span style="background: rgba(99, 102, 241, 0.1); border: 1px solid #6366f1; color: #818cf8; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Streak Alert</span>
      </div>
      <h2 style="color: #ffffff; font-size: 24px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.025em;">Don't break your ${streak}-day streak! ⚡</h2>
      <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">
        Hey <strong>${user.name}</strong>, it has been 3 days since you last practiced on PrepIntellect. Regular practice is key to acing SDE and technical interview rounds.
      </p>
      
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 20px; margin-bottom: 30px; display: inline-block; min-width: 200px;">
        <span style="color: #9ca3af; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.1em; display: block; margin-bottom: 4px;">Current Streak</span>
        <span style="color: #a855f7; font-size: 32px; font-weight: 900; letter-spacing: -0.05em;">${streak} Days</span>
      </div>

      <div>
        <a href="http://localhost:5173" style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 10px; font-size: 13px; font-weight: bold; box-shadow: 0 4px 15px rgba(99,102,241,0.4); display: inline-block;">
          Jump Back In & Practice
        </a>
      </div>
      <p style="color: #4b5563; font-size: 11px; margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
        PrepIntellect © 2026. Empowering candidates with AI-powered mock preparation.
      </p>
    </div>
  `;
  return sendEmail({
    to: user.email,
    subject: "Don't break your streak! ⚡ - PrepIntellect",
    html: html,
  });
}

/**
 * Send weekly report email
 */
async function sendWeeklyReportEmail(user, stats, sessions) {
  const completedCount = sessions.length;
  const avgTech = stats.avgTechnicalScore || 0;
  const avgComm = stats.avgCommunicationScore || 0;
  const avgProb = stats.avgProblemSolvingScore || 0;
  const overall = Math.round((avgTech + avgComm + avgProb) / 3) || 0;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid rgba(99, 102, 241, 0.2);">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="background: rgba(168, 85, 247, 0.1); border: 1px solid #a855f7; color: #c084fc; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Weekly Analytics</span>
      </div>
      <h2 style="text-align: center; color: #ffffff; font-size: 24px; font-weight: 800; margin-bottom: 6px; letter-spacing: -0.025em;">Your Prep Report is Ready! 📊</h2>
      <p style="text-align: center; color: #9ca3af; font-size: 14px; margin-bottom: 30px;">
        Hey <strong>${user.name}</strong>, here is a summary of your mock interview performance and SDE preparation this week.
      </p>
      
      <!-- Metrics Overview -->
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 20px; margin-bottom: 25px;">
        <div style="display: flex; justify-content: space-around; text-align: center;">
          <div style="flex: 1;">
            <span style="color: #9ca3af; font-size: 10px; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 4px;">XP Earned</span>
            <span style="color: #eab308; font-size: 20px; font-weight: 800;">+${user.xp || 0} XP</span>
          </div>
          <div style="flex: 1; border-left: 1px solid rgba(255,255,255,0.08); border-right: 1px solid rgba(255,255,255,0.08);">
            <span style="color: #9ca3af; font-size: 10px; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 4px;">Completed</span>
            <span style="color: #ffffff; font-size: 20px; font-weight: 800;">${completedCount} Mocks</span>
          </div>
          <div style="flex: 1;">
            <span style="color: #9ca3af; font-size: 10px; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 4px;">Overall Score</span>
            <span style="color: #06b6d4; font-size: 20px; font-weight: 800;">${overall}%</span>
          </div>
        </div>
      </div>

      <!-- Skill Breakdown -->
      <h3 style="color: #ffffff; font-size: 15px; font-weight: 700; margin-bottom: 12px; margin-top: 30px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px;">Skill Breakdown</h3>
      <div style="space-y: 12px;">
        <!-- Technical -->
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span style="color: #d1d5db; font-weight: 600;">Technical Knowledge</span>
            <span style="color: #818cf8; font-weight: bold;">${avgTech}%</span>
          </div>
          <div style="background: rgba(255,255,255,0.05); height: 6px; border-radius: 3px; overflow: hidden;">
            <div style="background: #6366f1; height: 100%; width: ${avgTech}%; border-radius: 3px;"></div>
          </div>
        </div>
        <!-- Communication -->
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span style="color: #d1d5db; font-weight: 600;">Communication Clarity</span>
            <span style="color: #c084fc; font-weight: bold;">${avgComm}%</span>
          </div>
          <div style="background: rgba(255,255,255,0.05); height: 6px; border-radius: 3px; overflow: hidden;">
            <div style="background: #a855f7; height: 100%; width: ${avgComm}%; border-radius: 3px;"></div>
          </div>
        </div>
        <!-- Problem Solving -->
        <div style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span style="color: #d1d5db; font-weight: 600;">Problem Solving</span>
            <span style="color: #22d3ee; font-weight: bold;">${avgProb}%</span>
          </div>
          <div style="background: rgba(255,255,255,0.05); height: 6px; border-radius: 3px; overflow: hidden;">
            <div style="background: #06b6d4; height: 100%; width: ${avgProb}%; border-radius: 3px;"></div>
          </div>
        </div>
      </div>

      <!-- Actionable Focus -->
      <div style="background: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.1); border-radius: 12px; padding: 18px; margin-top: 30px; margin-bottom: 30px;">
        <h4 style="color: #818cf8; font-size: 13px; font-weight: bold; margin: 0 0 6px 0;">🎯 Recommended Focus Area</h4>
        <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
          ${
            avgTech < avgComm && avgTech < avgProb
              ? "Focus on core data structures and runtime complexity analysis (Big-O notation)."
              : avgComm < avgProb
              ? "Work on structuring your answers using the STAR method (Situation, Task, Action, Result) and reducing filler words."
              : "Practice analyzing optimal system designs and outlining trade-offs between relational and non-relational databases."
          }
        </p>
      </div>

      <div style="text-align: center;">
        <a href="http://localhost:5173" style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 10px; font-size: 13px; font-weight: bold; box-shadow: 0 4px 15px rgba(99,102,241,0.4); display: inline-block;">
          View Full Dashboard Analytics
        </a>
      </div>
      <p style="text-align: center; color: #4b5563; font-size: 11px; margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
        PrepIntellect © 2026. Empowering candidates with AI-powered mock preparation.
      </p>
    </div>
  `;
  return sendEmail({
    to: user.email,
    subject: "Your Weekly Prep Report is Ready! 📊 - PrepIntellect",
    html: html,
  });
}

module.exports = {
  sendEmail,
  sendStreakWarningEmail,
  sendWeeklyReportEmail,
};
