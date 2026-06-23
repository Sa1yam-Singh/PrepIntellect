export function analyzeSpeechText(text, durationSeconds) {
  if (!text) return { wordCount: 0, wpm: 0, fillerCounts: {}, totalFillers: 0 };
  
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  
  const durationMinutes = durationSeconds > 0 ? durationSeconds / 60 : 0.05; // clamp to min 3 seconds equivalent
  const wpm = durationMinutes > 0 ? Math.round(wordCount / durationMinutes) : 0;
  
  const fillerPatterns = {
    um: /\bum\b/gi,
    uh: /\buh\b/gi,
    like: /\blike\b/gi,
    so: /\bso\b/gi,
    "you know": /\byou\s+know\b/gi
  };
  
  const fillerCounts = {};
  let totalFillers = 0;
  
  Object.entries(fillerPatterns).forEach(([key, regex]) => {
    const matches = text.match(regex);
    const count = matches ? matches.length : 0;
    fillerCounts[key] = count;
    totalFillers += count;
  });
  
  return {
    wordCount,
    wpm,
    fillerCounts,
    totalFillers
  };
}
