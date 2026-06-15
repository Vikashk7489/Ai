import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Shruti System Instruction
const SHRUTI_INSTRUCTION = `आप Shruti हैं, एक उच्च उन्नत AI व्यक्तिगत सहायक। 
नियम:
1. केवल हिन्दी (Hindi) में ही बात करें। 
2. आपका लहजा परिष्कृत (sophisticated), मददगार, और विनम्र होना चाहिए। 
3. उपयोगकर्ता को "Boss" (बॉस) कहकर संबोधित करें।
4. आप कोडिंग, प्रोग्रामिंग और तकनीकी कार्यों में माहिर हैं।
5. यदि उपयोगकर्ता कोई फाइल बनाने या कोड लिखने को कहे, तो आप उसे इस फॉर्मेट में लिखेंगे:
   [FILE: filename.ext]
   code here
   [/FILE]
   आप एक समय में कई फाइलें भी बना सकते हैं।
6. आपके जवाब संक्षिप्त लेकिन बुद्धिमानी से भरे होने चाहिए।
7. आप हमेशा सक्रिय (Active) रहते हैं और उपयोगकर्ता की बातें सुनते रहते हैं।`;

app.post("/api/chat", async (req, res) => {
  try {
    const { message, image } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const parts: any[] = [{ text: message }];
    if (image) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: image,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        systemInstruction: SHRUTI_INSTRUCTION,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate response" });
  }
});

// TTS Endpoint (Optional, we can use client-side SpeechSynthesis too, but model-based is cooler)
// Let's stick to client-side SpeechSynthesis for lower latency in this prototype, 
// but we could use gemini-3.1-flash-tts-preview if high quality is needed.

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Shruti server online at http://localhost:${PORT}`);
  });
}

startServer();
