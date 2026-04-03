import { useState, useCallback } from 'react';
import { streamChat } from '../lib/gemini.js';
import { supabase } from '../lib/supabase.js';

export function useChat(user) {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);

  async function sendMessage(text, systemPrompt) {
    if (!text.trim() || streaming) return;

    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setStreaming(true);

    // Placeholder da resposta do assistente
    const assistantMsg = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMsg]);

    const abortController = new AbortController();

    try {
      await streamChat(
        updatedMessages,
        systemPrompt || 'Você é um assistente útil para professores do FIEC. Responda em português do Brasil de forma clara e objetiva.',
        (token) => {
          setMessages(prev => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              next[next.length - 1] = { ...last, content: last.content + token };
            }
            return next;
          });
        },
        abortController.signal
      );

      // Salvar no Supabase se tiver usuário
      if (user) {
        setMessages(current => {
          saveChatHistory(current, user.id).catch(console.error);
          return current;
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant' && !last.content) {
            next[next.length - 1] = { ...last, content: 'Erro ao conectar com a IA. Tente novamente.' };
          }
          return next;
        });
      }
    } finally {
      setStreaming(false);
    }
  }

  async function saveChatHistory(msgs, userId) {
    const { error } = await supabase
      .from('chat_history')
      .upsert({
        user_id: userId,
        messages: msgs,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    if (error) console.error('saveChatHistory error:', error);
  }

  async function loadChatHistory(userId) {
    const { data, error } = await supabase
      .from('chat_history')
      .select('messages')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) { console.error('loadChatHistory error:', error); return; }
    if (data?.messages) setMessages(data.messages);
  }

  function clearHistory() {
    setMessages([]);
    if (user) {
      supabase.from('chat_history').delete().eq('user_id', user.id).then(() => {});
    }
  }

  return { messages, streaming, sendMessage, clearHistory, loadChatHistory };
}
