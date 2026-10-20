import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 audio clips
  app.use(express.json({ limit: '15mb' }));

  // 1. Audio Transcription with gemini-3.5-transcribe
  app.post('/api/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType, lang } = req.body as {
        audioBase64?: string;
        mimeType?: string;
        lang?: 'fr' | 'ar' | 'en';
      };

      if (!audioBase64 || typeof audioBase64 !== 'string') {
        res.status(400).json({ error: 'Missing audioBase64 payload.' });
        return;
      }

      const ai = getGenAIClient();
      const promptByLang =
        lang === 'ar'
          ? 'قم بتحويل هذا التسجيل الصوتي إلى نص واضح ودقيق (بالعربية أو الدارجة المغربية أو الفرنسية حسب ما قيل). أعد النص المفرغ فقط دون أي تعليق إضافي.'
          : lang === 'en'
          ? 'Transcribe this audio recording accurately. Return only the transcribed text without extra commentary.'
          : 'Transcris cet enregistrement vocal fidèlement et clairement. Retourne uniquement le texte transcrit sans commentaire supplémentaire.';

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: audioBase64
              }
            },
            {
              text: promptByLang
            }
          ]
        }
      });

      res.json({ text: (response.text || '').trim() });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error in /api/transcribe:', message);
      res.status(500).json({ error: message });
    }
  });

  // 2. Smart Receipt & Invoice OCR / Extraction with gemini-3.8-flash
  app.post('/api/analyze-receipt', async (req, res) => {
    try {
      const { fileBase64, mimeType, fileName, lang } = req.body as {
        fileBase64?: string;
        mimeType?: string;
        fileName?: string;
        lang?: 'fr' | 'ar' | 'en';
      };

      if (!fileBase64 || typeof fileBase64 !== 'string') {
        res.status(400).json({ error: 'Missing fileBase64 payload.' });
        return;
      }

      const ai = getGenAIClient();
      const langPrompt =
        lang === 'ar'
          ? 'استخرج من هذه الفاتورة أو الوصل: المبلغ الإجمالي بالدرهم (amount)، اسم الممون أو الشركة (vendor)، تاريخ الفاتورة بصيغة DD/MM/YYYY (date)، الصنف المناسب (category)، ووصف مختصر وواضح للمصروف باللغة العربية (title).'
          : lang === 'en'
          ? 'Extract from this receipt or invoice: the total amount in MAD (amount), the vendor/supplier name (vendor), the invoice date formatted as DD/MM/YYYY (date), the matching expense category (category), and a short clear description in English (title).'
          : 'Extrais de ce reçu ou facture : le montant total en MAD (amount), le nom du fournisseur ou prestataire (vendor), la date de la facture au format JJ/MM/AAAA (date), la catégorie correspondante (category), et un intitulé court et précis en français (title).';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: fileBase64
              }
            },
            {
              text: `${langPrompt}\nNom du fichier : ${fileName || 'facture'}`
            }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: {
                type: Type.NUMBER,
                description: 'Total invoice or receipt amount in MAD.'
              },
              vendor: {
                type: Type.STRING,
                description: 'Supplier, vendor, or utility company name.'
              },
              date: {
                type: Type.STRING,
                description: 'Invoice or receipt date formatted as DD/MM/YYYY.'
              },
              category: {
                type: Type.STRING,
                description:
                  'One of: catElevator, catCleaning, catSecurity, catUtilities, catPlumbing.'
              },
              title: {
                type: Type.STRING,
                description: 'Short clear description of the building expense.'
              }
            },
            required: ['amount', 'vendor', 'date', 'category', 'title']
          }
        }
      });

      const rawText = (response.text || '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error in /api/analyze-receipt:', message);
      res.status(500).json({ error: message });
    }
  });

  // 5. Stripe Checkout Session Endpoint
  app.post('/api/create-checkout-session', (req, res) => {
    const { plan } = req.body as { plan?: string };
    const selectedPlan = plan === 'standard_yearly' ? 'standard_yearly' : 'standard_monthly';
    res.json({
      sessionId: `cs_syndicdiali_${selectedPlan}_${Date.now()}`,
      plan: selectedPlan,
      amountMad: selectedPlan === 'standard_yearly' ? 490 : 49
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Syndic Diali server running on http://localhost:${PORT}`);
  });
}

startServer();
