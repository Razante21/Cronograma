import Anthropic from '@anthropic-ai/sdk';

const cfg = window.APP_CONFIG || {};
const client = new Anthropic({
  apiKey: cfg.ANTHROPIC_API_KEY || import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true
});

const SUGGESTION_TOOL = {
  name: 'suggest_card_update',
  description: 'Sugere atualização de título ou descrição de um card de aula',
  input_schema: {
    type: 'object',
    properties: {
      card_id: { type: 'string', description: 'ID do card (ex: i1, a3, enc)' },
      field: { type: 'string', enum: ['title', 'description'] },
      value: { type: 'string', description: 'Novo valor sugerido' },
      reason: { type: 'string', description: 'Justificativa' }
    },
    required: ['card_id', 'field', 'value', 'reason']
  }
};

// Tool use tipado para sugestões (cookbooks/tool_use)
export async function getSuggestions(systemPrompt, userContext) {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    tools: [SUGGESTION_TOOL],
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userContext }]
  });
  return response.content
    .filter(b => b.type === 'tool_use' && b.name === 'suggest_card_update')
    .map(b => b.input);
}

// Descrever imagem de atividade (cookbooks/multimodal) — para uso futuro
export async function describeActivityImage(base64Image, mimeType = 'image/jpeg') {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Image } },
        { type: 'text', text: 'Descreva o conteúdo desta atividade escolar em 2-3 frases objetivas para um professor registrar no cronograma.' }
      ]
    }]
  });
  return response.content[0]?.text || '';
}
