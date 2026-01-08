import { GoogleGenAI, Type } from "@google/genai";
import { MCQ, ExamType, Subject, ChatMessage, DifficultyLevel, FeedbackType, MockTestResult } from "./types";

// Note: Ensure API_KEY is set in Netlify Environment Variables.
// The vite.config.ts will handle the injection into process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const TELEGRAM_BOT_TOKEN = "8536186288:AAH2eqSeass1FVBjde2FIk7rqDoikO66Zy8";
const TELEGRAM_CHAT_ID = "@smartedukmr";

export const sendTelegramFeedback = async (name: string, exam: string, message: string): Promise<boolean> => {
  const formattedText = `📘 SmartEduKMR Feedback\n👤 Name: ${name}\n🎯 Exam: ${exam}\n💬 Message: ${message}`;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${encodeURIComponent(TELEGRAM_CHAT_ID)}&text=${encodeURIComponent(formattedText)}`;
  try {
    const response = await fetch(url);
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const sendCertificateToTelegram = async (name: string, certBlob: Blob): Promise<boolean> => {
  try {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('document', certBlob, `${name}_Excellence_Certificate.pdf`);
    formData.append('caption', `🏅 *OFFICIAL MERIT RECOGNITION*\n\nAspirant *${name}* has achieved a high score (>100/200) in a Realistic Mock Test. Certificate is attached.`);
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: formData
    });
    return response.ok;
  } catch (e) {
    return false;
  }
};

export const sendMockTestReportToTelegram = async (name: string, exam: string, result: MockTestResult, omrBlob: Blob): Promise<boolean> => {
  const dateStr = new Date(result.date).toLocaleString();
  const summary = `🏆 *SMARTEDUKMR MOCK TEST REPORT* 🏆\n\n👤 *Aspirant:* ${name}\n🎯 *Exam Type:* ${exam}\n📅 *Date & Time:* ${dateStr}\n⏱️ *Duration:* Real-time Simulated\n\n📊 *PERFORMANCE SUMMARY*\n✅ *Total Score:* ${result.score}/${result.total}\n📉 *Accuracy:* ${result.accuracy}%\n⚡ *Readiness:* ${result.readinessPercentage}%\n\n_Official OMR Sheet is attached below._`;
  
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: summary,
        parse_mode: 'Markdown'
      })
    });

    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('document', omrBlob, `${name}_OMR_REPORT.pdf`);
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: formData
    });

    return response.ok;
  } catch (error) {
    console.error("Telegram delivery failed", error);
    return false;
  }
};

export const generateMCQs = async (
  examType: ExamType,
  subjects: Subject[],
  difficulty: DifficultyLevel = 'Medium',
  count: number = 20,
  isMock: boolean = false
): Promise<MCQ[]> => {
  const model = "gemini-3-flash-preview";
  let promptPrefix = "";
  
  if (examType === '10TH_NCERT' || examType === '12TH_NCERT') {
    promptPrefix = `Follow strict CBSE and NCERT textbook patterns for ${examType}. `;
  } else if (examType === 'MIXED') {
    promptPrefix = `Combine patterns from multiple major exams (NEET, JEE, SSB). `;
  }

  const prompt = isMock 
    ? `${promptPrefix}Generate a HIGHLY REALISTIC ENTRANCE EXAM for ${examType}. Total: ${count} MCQs. Subjects: ${subjects.join(", ")}. Ensure professional standard complexity. Include tricky distractor options and detailed academic explanations.`
    : `${promptPrefix}Generate ${count} MCQs for ${examType} pattern. Subjects: ${subjects.join(", ")}. Difficulty: ${difficulty}.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 4, maxItems: 4 },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              subject: { type: Type.STRING },
              difficulty: { type: Type.STRING }
            },
            required: ["id", "question", "options", "correctAnswer", "explanation", "subject", "difficulty"]
          }
        }
      }
    });
    return JSON.parse(response.text) as MCQ[];
  } catch (error) {
    return [];
  }
};

export const getDailyInspiration = async (): Promise<{ quote: string, author: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a soothing motivational quote for a student in Kashmir focusing on Sabr and Knowledge.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { quote: { type: Type.STRING }, author: { type: Type.STRING } },
          required: ["quote", "author"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (e) {
    return { quote: "Indeed, with hardship comes ease. (94:6)", author: "Al-Quran" };
  }
};

export const askAiTutor = async (userPrompt: string, history: ChatMessage[], contextMcq?: MCQ): Promise<string> => {
  let contextStr = "";
  if (contextMcq) {
    contextStr = `
CONTEXT MCQ:
Question: ${contextMcq.question}
Options:
A) ${contextMcq.options[0]}
B) ${contextMcq.options[1]}
C) ${contextMcq.options[2]}
D) ${contextMcq.options[3]}
Correct Answer Index: ${contextMcq.correctAnswer}
Explanation Provided: ${contextMcq.explanation}
`;
  }

  const systemInstruction = `
You are the SEK Expert AI Tutor. Provide a 'Strategic Analysis' response:
1. One-sentence Core Concept: Summarize the fundamental principle.
2. 3-4 Bulleted Analysis Points: Deep technical breakdown.
3. Pro Exam Tip: A practical trick or shortcut for similar questions.
Tone: Encouraging, professional, and technical.
`;

  const contents = [
    ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: 'user', parts: [{ text: `${contextStr}\n\nUser Query: ${userPrompt}` }] }
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
    config: { systemInstruction }
  });
  return response.text || "Neural core busy. Please rephrase.";
};