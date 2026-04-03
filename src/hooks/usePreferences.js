import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { calcLessonDates } from '../lib/utils.js';
import { MAIN_TEMPLATE_EMAIL } from '../lib/constants.js';

const DEFAULT_OWNER_PREFS = {
  start_date: '2026-02-23',
  weekdays: [[1, 3], [1, 3]],
  turmas: ['Intermediário', 'Avançado'],
  turma_count: 2,
  allow_ai_edits: true,
  cycle_type: 'mod20'
};

export function usePreferences(user) {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(false);

  const isOwner = user?.email === MAIN_TEMPLATE_EMAIL;

  useEffect(() => {
    if (!user) { setPrefs(null); return; }
    loadPreferences(user.id);
  }, [user]);

  async function loadPreferences(userId) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPrefs(data);
      } else if (isOwner) {
        // Owner sem prefs — criar defaults
        await ensureOwnerPrefs(userId);
      } else {
        setPrefs(null);
      }
    } catch (err) {
      console.error('loadPreferences error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function ensureOwnerPrefs(userId) {
    // Se owner e start_date != '2026-02-23', cria/atualiza defaults
    const row = {
      user_id: userId,
      ...DEFAULT_OWNER_PREFS,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(row, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) {
      console.error('ensureOwnerPrefs error:', error);
    } else {
      setPrefs(data);
    }
  }

  async function savePreferences(prefsData) {
    if (!user) return;
    const row = {
      user_id: user.id,
      ...prefsData,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(row, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) {
      // Fallback: delete + insert
      await supabase.from('user_preferences').delete().eq('user_id', user.id);
      const { data: d2, error: e2 } = await supabase
        .from('user_preferences')
        .insert(row)
        .select()
        .single();
      if (e2) throw e2;
      setPrefs(d2);
    } else {
      setPrefs(data);
    }
  }

  function calcCalendar(p) {
    if (!p) return {};
    const startDate = p.start_date || '2026-02-23';
    const weekdays = p.weekdays || [[1, 3], [1, 3]];
    const turmaCount = p.turma_count || weekdays.length || 2;
    const calendarJson = {};
    for (let t = 0; t < turmaCount; t++) {
      const wds = weekdays[t] || weekdays[0] || [1, 3];
      const dates = calcLessonDates(startDate, wds, 33);
      Object.entries(dates).forEach(([key, val]) => {
        calendarJson[`t${t}_${key}`] = val;
      });
    }
    return calendarJson;
  }

  function getCalendarDate(cardId, calendarJson) {
    if (!calendarJson || !cardId) return null;

    // 'enc' → t0_lesson_20 ou lesson_20
    if (cardId === 'enc') {
      return calendarJson['t0_lesson_20'] || calendarJson['lesson_20'] || null;
    }

    // Padrão: [prefix][N] ex: i1, a3, b2
    const match = cardId.match(/^([a-z]+)(\d+)$/);
    if (!match) return null;

    const prefix = match[1];
    const n = parseInt(match[2], 10);

    // i/c → turma 0; a/d → turma 1; b/e → turma 2
    let tIdx = 0;
    if (['a', 'd'].includes(prefix)) tIdx = 1;
    else if (['b', 'e'].includes(prefix)) tIdx = 2;

    return calendarJson[`t${tIdx}_lesson_${n}`] || null;
  }

  return {
    prefs,
    loading,
    savePreferences,
    calcCalendar,
    getCalendarDate,
    ensureOwnerPrefs,
    reload: () => user && loadPreferences(user.id)
  };
}
