import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { D, MAIN_TEMPLATE_EMAIL } from '../lib/constants.js';

export function useCards(user) {
  const [cards, setCards] = useState({});
  const [loading, setLoading] = useState(false);

  const isOwner = user?.email === MAIN_TEMPLATE_EMAIL;

  async function loadCards(userId, ownerFlag) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_card_content')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      // Constrói mapa de cards do banco
      const dbCards = {};
      (data || []).forEach(row => {
        dbCards[row.card_id] = {
          title: row.title,
          description: row.description,
          activityLink: row.activity_link,
          lessonDate: row.lesson_date,
          tags: row.tags || [],
          done: row.done || false,
          userId: row.user_id
        };
      });

      if (ownerFlag) {
        // Merge template D[] com dados do banco para owner
        const merged = {};
        const missingIds = [];
        Object.entries(D).forEach(([id, tmpl]) => {
          if (dbCards[id]) {
            merged[id] = { ...dbCards[id], _template: tmpl };
          } else {
            // Card do template não está no banco — adicionar à lista para sync
            missingIds.push(id);
            merged[id] = {
              title: tmpl.t,
              description: tmpl.tp?.join('\n') || '',
              activityLink: '',
              lessonDate: null,
              tags: [],
              done: tmpl.done || false,
              _template: tmpl
            };
          }
        });

        // Adicionar cards extras que estão no banco mas não no template
        Object.entries(dbCards).forEach(([id, card]) => {
          if (!merged[id]) merged[id] = card;
        });

        setCards(merged);

        // Sincronizar cards ausentes do banco em background
        if (missingIds.length > 0) {
          syncTemplateToDb(missingIds, userId).catch(console.error);
        }
      } else {
        setCards(dbCards);
      }
    } catch (err) {
      console.error('loadCards error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveCard(cardId, data) {
    if (!user) return;
    const row = {
      user_id: user.id,
      card_id: cardId,
      title: data.title || '',
      description: data.description || '',
      activity_link: data.activityLink || '',
      lesson_date: data.lessonDate || null,
      tags: data.tags || [],
      done: data.done || false,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('user_card_content')
      .upsert(row, { onConflict: 'user_id,card_id' });

    if (error) {
      // Fallback: delete + insert
      await supabase.from('user_card_content').delete().match({ user_id: user.id, card_id: cardId });
      const { error: e2 } = await supabase.from('user_card_content').insert(row);
      if (e2) throw e2;
    }

    // Atualiza state local
    setCards(prev => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        title: data.title,
        description: data.description,
        activityLink: data.activityLink,
        lessonDate: data.lessonDate,
        tags: data.tags,
        done: data.done
      }
    }));
  }

  async function deleteCard(cardId) {
    if (!user) return;
    const { error } = await supabase
      .from('user_card_content')
      .delete()
      .match({ user_id: user.id, card_id: cardId });
    if (error) throw error;

    setCards(prev => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  }

  async function syncTemplateToDb(missingIds, userId) {
    const rows = missingIds.map(id => {
      const tmpl = D[id];
      return {
        user_id: userId,
        card_id: id,
        title: tmpl.t,
        description: tmpl.tp?.join('\n') || '',
        activity_link: '',
        lesson_date: null,
        tags: [],
        done: tmpl.done || false,
        updated_at: new Date().toISOString()
      };
    });

    // Inserir em lotes de 10
    for (let i = 0; i < rows.length; i += 10) {
      const batch = rows.slice(i, i + 10);
      const { error } = await supabase
        .from('user_card_content')
        .upsert(batch, { onConflict: 'user_id,card_id' });
      if (error) {
        console.error('syncTemplateToDb batch error:', error);
      }
    }
  }

  return { cards, loading, loadCards, saveCard, deleteCard, syncTemplateToDb };
}
