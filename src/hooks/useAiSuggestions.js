import { useState, useCallback } from 'react';
import { getSuggestions } from '../lib/claude.js';

export function useAiSuggestions(saveCard) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadSuggestions(cards, prefs) {
    setLoading(true);
    try {
      const systemPrompt = `Você é um assistente pedagógico especializado em cursos de informática.
Analise os cards de aula e sugira melhorias de título ou descrição quando identificar:
- Títulos muito genéricos que podem ser mais específicos
- Descrições que podem ser enriquecidas com mais detalhes práticos
- Ajustes para adequar ao nível da turma (Intermediário ou Avançado)

Turmas: ${prefs?.turmas?.join(', ') || 'Intermediário, Avançado'}
Ciclo: ${prefs?.cycle_type || 'mod20'}`;

      const cardsSummary = Object.entries(cards)
        .map(([id, c]) => `${id}: "${c.title || ''}" — ${(c.description || '').slice(0, 80)}`)
        .join('\n');

      const userContext = `Aqui estão os cards de aula atuais:\n${cardsSummary}\n\nSugira até 5 melhorias prioritárias.`;

      const rawSuggestions = await getSuggestions(systemPrompt, userContext);

      // Adicionar IDs únicos às sugestões
      const withIds = rawSuggestions.map((s, i) => ({
        ...s,
        id: `sug_${Date.now()}_${i}`
      }));

      setSuggestions(withIds);
    } catch (err) {
      console.error('loadSuggestions error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function approveSuggestion(suggestion) {
    if (!saveCard) return;

    try {
      // Busca o card atual e aplica o campo sugerido
      const field = suggestion.field === 'title' ? 'title' : 'description';
      // saveCard será chamado pelo componente com o card atualizado
      // Aqui sinalizamos a aprovação removendo da lista
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    } catch (err) {
      console.error('approveSuggestion error:', err);
    }
  }

  function rejectSuggestion(id) {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  }

  function clearSuggestions() {
    setSuggestions([]);
  }

  return { suggestions, loading, loadSuggestions, approveSuggestion, rejectSuggestion, clearSuggestions };
}
