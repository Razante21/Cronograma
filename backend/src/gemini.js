import { gemini } from './clients.js';
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

  const response = await gemini.models.generateContent({
    model: config.geminiModel,
    contents: prompt
  });

  const text = response.text?.trim() || '{}';
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {
      module: 'Módulo I',
      lesson_number: 1,
      theme: 'Classificação manual necessária',
      confidence: 0,
      reason: 'Falha ao interpretar retorno JSON do modelo.'
    };
  }

  return parsed;
}
