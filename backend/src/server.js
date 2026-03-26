import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { classifyActivity } from './gemini.js';
import { requireSupabase, supabaseAdmin, gemini } from './clients.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/', (_req, res) => {
  res.status(200).json({
    ok: true,
    message: 'cronograma-api online',
    endpoints: [
      'GET /health',
      'POST /api/activities',
      'POST /api/classify',
      'GET /api/cards/:userId',
      'POST /api/cards/upsert',
      'POST /api/chat',
      'GET /api/preferences/:userId',
      'POST /api/preferences/upsert'
    ]
  });
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'cronograma-api',
    integrations: {
      supabase: Boolean(supabaseAdmin),
      gemini: Boolean(gemini)
    }
  });
});

app.post('/api/classify', async (req, res) => {
  try {
    const { userId, fileName, extractedText = '', activityId } = req.body || {};
    if (!userId || !fileName) {
      return res.status(400).json({ error: 'userId e fileName são obrigatórios.' });
    }

    const result = await classifyActivity({ fileName, extractedText });

    if (activityId) {
      const sb = requireSupabase();
      await sb
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
    return res.status(500).json({ error: error.message || 'Erro ao classificar atividade.' });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const { userId, fileName, filePath, mimeType, fileSize, extractedText = '' } = req.body || {};
    if (!userId || !fileName || !filePath) {
      return res.status(400).json({ error: 'userId, fileName e filePath são obrigatórios.' });
    }

    const sb = requireSupabase();
    const { data, error } = await sb
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
    return res.status(500).json({ error: error.message || 'Erro ao criar atividade.' });
  }
});

app.get('/api/cards/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('user_card_content')
      .select('card_id,title,description,activity_link,updated_at')
      .eq('user_id', userId);

    if (error) {
      if ((error.message || '').includes('user_card_content')) {
        return res.json({
          cards: [],
          warning: 'Tabela user_card_content não encontrada. Rode o SQL atualizado em supabase/schema.sql.'
        });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.json({ cards: data || [] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Erro ao buscar cards.' });
  }
});

app.post('/api/cards/upsert', async (req, res) => {
  try {
    const { userId, cardId, title, description, activityLink = '' } = req.body || {};
    if (!userId || !cardId || !title || !description) {
      return res.status(400).json({ error: 'userId, cardId, title e description são obrigatórios.' });
    }
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('user_card_content')
      .upsert(
        {
          user_id: userId,
          card_id: cardId,
          title,
          description,
          activity_link: activityLink || null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,card_id' }
      )
      .select('card_id,title,description,activity_link,updated_at')
      .single();

    if (error) {
      if ((error.message || '').includes('user_card_content')) {
        return res.status(500).json({ error: 'Tabela user_card_content não encontrada. Rode o SQL atualizado em supabase/schema.sql.' });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.json({ card: data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Erro ao salvar card.' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, allowAiEdits = true } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message é obrigatório.' });
    if (!allowAiEdits) {
      return res.json({ answer: 'IA sem permissão para alterar conteúdo. Ative a permissão no painel para usar automações.' });
    }
    if (!gemini) {
      return res.json({
        answer: 'Chat ativo em modo básico. Configure GEMINI_API_KEY para respostas inteligentes.'
      });
    }
    const result = await classifyActivity({ fileName: 'chat.txt', extractedText: message });
    return res.json({
      answer: `Entendi sua solicitação. Sugestão inicial: ${result.theme} (aula ${result.lesson_number}, ${result.module}).`
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Erro no chat.' });
  }
});

app.get('/api/preferences/:userId', async (req, res) => {
  try {
    const sb = requireSupabase();
    const { userId } = req.params;
    const { data, error } = await sb
      .from('user_preferences')
      .select('turma_count,cycle_type,module_count,allow_ai_edits')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ preferences: data || null });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Erro ao buscar preferências.' });
  }
});

app.post('/api/preferences/upsert', async (req, res) => {
  try {
    const { userId, turmaCount = 1, cycleType = 'mod12', moduleCount = 1, allowAiEdits = false } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId é obrigatório.' });
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('user_preferences')
      .upsert(
        {
          user_id: userId,
          turma_count: Number(turmaCount) || 1,
          cycle_type: cycleType,
          module_count: Number(moduleCount) || 1,
          allow_ai_edits: Boolean(allowAiEdits),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )
      .select('turma_count,cycle_type,module_count,allow_ai_edits')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ preferences: data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Erro ao salvar preferências.' });
  }
});

app.listen(config.port, () => {
  console.log(`API rodando em http://localhost:${config.port}`);
});
