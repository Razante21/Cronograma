import { requireGemini } from './clients.js';
import { config } from './config.js';

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
