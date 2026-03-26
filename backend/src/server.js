import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { classifyActivity } from './gemini.js';
import { supabaseAdmin } from './clients.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'cronograma-api' });
});

app.post('/api/classify', async (req, res) => {
  try {
    const { userId, fileName, extractedText = '', activityId } = req.body || {};
    if (!userId || !fileName) {
      return res.status(400).json({ error: 'userId e fileName são obrigatórios.' });
    }

    const result = await classifyActivity({ fileName, extractedText });

    if (activityId) {
      await supabaseAdmin
        .from('activities')
        .update({
          detected_theme: result.theme,
          ai_confidence: result.confidence,
          ai_payload: result
        })
        .eq('id', activityId)
        .eq('user_id', userId);
    }

    return res.json({
      classification: result,
      needsReview: Number(result.confidence || 0) < config.aiConfidenceThreshold
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao classificar atividade.' });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const { userId, fileName, filePath, mimeType, fileSize, extractedText = '' } = req.body || {};
    if (!userId || !fileName || !filePath) {
      return res.status(400).json({ error: 'userId, fileName e filePath são obrigatórios.' });
    }

    const { data, error } = await supabaseAdmin
      .from('activities')
      .insert({
        user_id: userId,
        file_name: fileName,
        file_path: filePath,
        mime_type: mimeType,
        file_size: fileSize,
        extracted_text: extractedText,
        file_ext: fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : null
      })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ activity: data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar atividade.' });
  }
});

app.listen(config.port, () => {
  console.log(`API rodando em http://localhost:${config.port}`);
});
