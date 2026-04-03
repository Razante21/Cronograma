const cfg = window.APP_CONFIG || {};
const GEMINI_KEY = cfg.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview'; // FIXO — nunca mudar

export async function streamChat(messages, systemPrompt, onToken, signal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const chunk = JSON.parse(line.slice(6));
        const token = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (token) onToken(token);
      } catch {}
    }
  }
}

export async function getEmbedding(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] } })
    }
  );
  const data = await res.json();
  return data.embedding?.values || [];
}

function cosine(a, b) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const ma = Math.sqrt(a.reduce((s, v) => s + v*v, 0));
  const mb = Math.sqrt(b.reduce((s, v) => s + v*v, 0));
  return (ma && mb) ? dot / (ma * mb) : 0;
}

export async function semanticSearch(query, items, getText) {
  const qEmb = await getEmbedding(query);
  const scored = await Promise.all(items.map(async item => ({
    item, score: cosine(qEmb, await getEmbedding(getText(item)))
  })));
  return scored.sort((a, b) => b.score - a.score).slice(0, 5).map(r => r.item);
}
