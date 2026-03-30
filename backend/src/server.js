import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { classifyActivity, chatWithGemini } from './gemini.js';
import { requireSupabase, supabaseAdmin, gemini } from './clients.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/files', express.static(path.join(__dirname, '../../files')));

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
      'GET /api/chat/messages/:userId',
      'POST /api/chat/messages',
      'GET /api/preferences/:userId',
      'POST /api/preferences/upsert',
      'GET /api/ai-suggestions/:userId',
      'POST /api/ai-suggestions',
      'PATCH /api/ai-suggestions/:id'
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
      .select('card_id,title,description,activity_link,lesson_date,tags,updated_at')
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
    const { userId, cardId, title, description, activityLink = '', lessonDate = null, tags = null } = req.body || {};
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
          lesson_date: lessonDate || null,
          tags: tags || null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,card_id' }
      )
      .select('card_id,title,description,activity_link,lesson_date,tags,updated_at')
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
    const { message, userId, allowAiEdits = false, cardContext = [], history = [] } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message é obrigatório.' });
    if (!gemini) {
      return res.json({ answer: 'Chat ativo em modo básico. Configure GEMINI_API_KEY para respostas inteligentes.', suggestions: [] });
    }

    const result = await chatWithGemini({ message, cardContext, history });
    const { answer, suggestions = [] } = result;

    // Salvar sugestões no banco se houver e usuário estiver logado
    if (userId && suggestions.length > 0) {
      const sb = requireSupabase();
      const rows = suggestions.map(s => ({
        user_id: userId,
        card_id: s.card_id,
        field: s.field,
        current_value: s.current_value || null,
        suggested_value: s.suggested_value,
        reason: s.reason || null,
        status: allowAiEdits ? 'pending' : 'pending'
      }));
      await sb.from('ai_suggestions').insert(rows);
    }

    return res.json({ answer, suggestions, suggestionCount: suggestions.length });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Erro no chat.' });
  }
});

app.get('/api/chat/messages/:userId', async (req, res) => {
  try {
    const sb = requireSupabase();
    const { userId } = req.params;
    const { data, error } = await sb
      .from('chat_messages')
      .select('role,content,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ messages: data || [] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Erro ao carregar histórico do chat.' });
  }
});

app.post('/api/chat/messages', async (req, res) => {
  try {
    const sb = requireSupabase();
    const { userId, role, content } = req.body || {};
    if (!userId || !role || !content) return res.status(400).json({ error: 'userId, role e content são obrigatórios.' });
    const { data, error } = await sb
      .from('chat_messages')
      .insert({ user_id: userId, role, content })
      .select('role,content,created_at')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ message: data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Erro ao salvar mensagem do chat.' });
  }
});

app.get('/api/preferences/:userId', async (req, res) => {
  try {
    const sb = requireSupabase();
    const { userId } = req.params;
    const { data, error } = await sb
      .from('user_preferences')
      .select('turma_count,cycle_type,module_count,start_date,turmas_json,allow_ai_edits,weekdays_json,calendar_json')
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
    const { userId, turmaCount = 1, cycleType = 'mod12', moduleCount = 1, startDate = null, turmas = [], allowAiEdits = false, weekdays = [1,3], calendarJson = {} } = req.body || {};
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
          start_date: startDate || null,
          turmas_json: Array.isArray(turmas) ? turmas : [],
          allow_ai_edits: Boolean(allowAiEdits),
          weekdays_json: Array.isArray(weekdays) ? weekdays : [1,3],
          calendar_json: calendarJson || {},
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )
      .select('turma_count,cycle_type,module_count,start_date,turmas_json,allow_ai_edits,weekdays_json,calendar_json')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ preferences: data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Erro ao salvar preferências.' });
  }
});

app.get('/api/ai-suggestions/:userId', async (req, res) => {
  try {
    const sb = requireSupabase();
    const { userId } = req.params;
    const { status = 'pending' } = req.query;
    const { data, error } = await sb
      .from('ai_suggestions')
      .select('id,card_id,field,current_value,suggested_value,reason,status,created_at')
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ suggestions: data || [] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Erro ao buscar sugestões.' });
  }
});

app.patch('/api/ai-suggestions/:id', async (req, res) => {
  try {
    const sb = requireSupabase();
    const { id } = req.params;
    const { userId, action } = req.body || {}; // action: 'approve' | 'reject'
    if (!userId || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'userId e action (approve|reject) são obrigatórios.' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const { data: suggestion, error: fetchErr } = await sb
      .from('ai_suggestions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (fetchErr || !suggestion) return res.status(404).json({ error: 'Sugestão não encontrada.' });

    await sb.from('ai_suggestions').update({ status: newStatus }).eq('id', id);

    // Se aprovada, aplica a mudança no card
    if (action === 'approve') {
      const patch = { updated_at: new Date().toISOString() };
      if (suggestion.field === 'title') patch.title = suggestion.suggested_value;
      else if (suggestion.field === 'description') patch.description = suggestion.suggested_value;
      else if (suggestion.field === 'activity_link') patch.activity_link = suggestion.suggested_value;
      else if (suggestion.field === 'tags') patch.tags = suggestion.suggested_value;

      const { data: existing } = await sb
        .from('user_card_content')
        .select('id,title,description')
        .eq('user_id', userId)
        .eq('card_id', suggestion.card_id)
        .maybeSingle();

      if (existing) {
        await sb.from('user_card_content').update(patch).eq('user_id', userId).eq('card_id', suggestion.card_id);
      } else if (patch.title || patch.description) {
        await sb.from('user_card_content').insert({
          user_id: userId,
          card_id: suggestion.card_id,
          title: patch.title || suggestion.card_id,
          description: patch.description || '',
          ...patch
        });
      }
    }

    return res.json({ ok: true, status: newStatus });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Erro ao processar sugestão.' });
  }
});

app.listen(config.port, () => {
  console.log(`API rodando em http://localhost:${config.port}`);
});
