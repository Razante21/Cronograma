import { requireGemini } from './clients.js';
import { config } from './config.js';

export async function chatWithGemini({ message, cardContext = [], history = [] }) {
  const cardSummary = cardContext.length
    ? cardContext.map(c => `Card ${c.card_id}: "${c.title}" — ${c.description}`).join('\n')
    : 'Nenhum card configurado ainda.';

  const historyText = history.slice(-6).map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`).join('\n');

  const prompt = `Você é um assistente inteligente de um cronograma de aulas.
Você pode sugerir mudanças nos cards das aulas, responder dúvidas e ajudar o professor.

Cards atuais do cronograma:
${cardSummary}

Histórico recente:
${historyText}

Responda SOMENTE em JSON válido, sem markdown, com este formato:
{
  "answer": "resposta em texto para o usuário (português, amigável)",
  "suggestions": [
    {
      "card_id": "id do card (ex: i1, a5, enc)",
      "field": "campo a alterar: title | description | activity_link | tags",
      "suggested_value": "novo valor sugerido",
      "reason": "motivo breve"
    }
  ]
}
Se não houver sugestões de mudança, retorne suggestions como array vazio [].

Mensagem do usuário: ${message}`;

  try {
    const client = requireGemini();
    const response = await client.models.generateContent({
      model: config.geminiModel,
      contents: prompt
    });
    const text = (response.text || '{}').trim()
      .replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    return JSON.parse(text);
  } catch (error) {
    const msg = String(error?.message || error || '');
    const unavailable = msg.includes('503') || msg.includes('UNAVAILABLE');
    return {
      answer: unavailable
        ? 'A IA está sobrecarregada no momento. Tente em instantes.'
        : 'Não consegui processar sua solicitação. Tente reformular.',
      suggestions: []
    };
  }
}

export async function classifyActivity({ fileName, extractedText }) {
  const prompt = `
Você classifica atividades em um cronograma de 33 aulas.
Responda SOMENTE JSON com as chaves:
module ("Módulo I" ou "Módulo II"),
lesson_number (1..33),
theme (string curta),
confidence (0..1),
reason (string curta).

Arquivo: ${fileName}
Texto extraído (resumo): ${extractedText?.slice(0, 4000) || ''}
`;

  try {
    const client = requireGemini();
    const response = await client.models.generateContent({
      model: config.geminiModel,
      contents: prompt
    });

    const text = response.text?.trim() || '{}';
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();

    return JSON.parse(cleaned);
  } catch (error) {
    const msg = String(error?.message || error || '');
    const unavailable = msg.includes('503') || msg.includes('UNAVAILABLE');
    return {
      module: 'Módulo I',
      lesson_number: 1,
      theme: unavailable ? 'IA indisponível no momento' : 'Classificação manual necessária',
      confidence: 0,
      reason: unavailable
        ? 'Gemini indisponível temporariamente (alta demanda). Tente novamente em instantes.'
        : 'Falha ao interpretar/gerar retorno do modelo.'
    };
  }
}
