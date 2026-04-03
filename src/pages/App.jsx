import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';

import { useAuth } from '../hooks/useAuth.js';
import { useCards } from '../hooks/useCards.js';
import { usePreferences } from '../hooks/usePreferences.js';
import { useChat } from '../hooks/useChat.js';
import { useAiSuggestions } from '../hooks/useAiSuggestions.js';

import { D, MAIN_TEMPLATE_EMAIL } from '../lib/constants.js';
import { isoToday } from '../lib/utils.js';
import { supabase } from '../lib/supabase.js';

import Sidebar from '../components/Sidebar.jsx';
import LessonCard from '../components/LessonCard.jsx';
import DetailModal from '../components/DetailModal.jsx';
import EditModal from '../components/EditModal.jsx';
import ChatBox from '../components/ChatBox.jsx';
import Wizard from '../components/Wizard.jsx';
import SuggestionPanel from '../components/SuggestionPanel.jsx';
import LandingPage from '../components/LandingPage.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

const PREFIX_COL = { i: 0, c: 0, a: 1, d: 1, b: 2, e: 2 };

function getTurmaIdx(cardId) {
  if (cardId === 'enc') return 0;
  const prefix = cardId.replace(/\d+$/, '');
  return PREFIX_COL[prefix] ?? 0;
}

function buildColumns(prefs) {
  // Retorna array de colunas: [{ turmaIdx, keys: ['i1','i2',...,'enc'] }, ...]
  if (!prefs) return [];
  const turmaCount = prefs.turma_count || 2;
  const turmaNames = prefs.turmas || ['Intermediário', 'Avançado'];
  const PREFIXES = [['i','c'], ['a','d'], ['b','e']];
  const cols = [];
  for (let t = 0; t < turmaCount; t++) {
    const pxs = PREFIXES[t] || PREFIXES[0];
    const keys = [];
    // Aulas numeradas: 1..19
    for (let n = 1; n <= 19; n++) {
      const id = `${pxs[0]}${n}`;
      if (D[id] || true) keys.push(id); // inclui mesmo se não está em D (usuários)
    }
    // Encerramento
    if (t === 0) keys.push('enc');
    cols.push({ turmaIdx: t, name: turmaNames[t] || `Turma ${t + 1}`, keys });
  }
  return cols;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, []);
  const icons = { success: '✓', error: '✕', warning: '⚠' };
  return (
    <div className={`toast ${type}`}>
      <span style={{ color: type === 'success' ? 'var(--green)' : type === 'error' ? 'var(--red)' : 'var(--yellow)' }}>
        {icons[type] || '•'}
      </span>
      {msg}
    </div>
  );
}

// ── GalleryView ───────────────────────────────────────────────────────────────

function GalleryView({ onOpenPublic }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('user_id, display_name, turmas, turma_count, updated_at')
        .not('display_name', 'is', null)
        .limit(24);
      if (!error) setProfiles(data || []);
    } catch (err) {
      console.error('loadProfiles error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div style={{ padding: 32, color: 'var(--text-muted)', fontSize: 14 }}>Carregando...</div>
  );

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Galeria de Cronogramas</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        Cronogramas públicos de outros professores do FIEC.
      </p>
      {profiles.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Nenhum cronograma público ainda.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {profiles.map(p => (
            <button
              key={p.user_id}
              onClick={() => onOpenPublic?.(p.user_id)}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 16px',
                cursor: 'pointer', textAlign: 'left',
                transition: 'border-color 0.15s',
                color: 'var(--text)'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-i)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                {p.display_name || 'Professor'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {(p.turmas || []).join(', ')}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── HistoryView ───────────────────────────────────────────────────────────────

function HistoryView({ messages, onClear }) {
  return (
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Histórico do Chat</h2>
        {messages.length > 0 && (
          <button className="btn btn-ghost" onClick={onClear} style={{ fontSize: 12 }}>
            Limpar tudo
          </button>
        )}
      </div>
      {messages.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Nenhuma conversa ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 14px',
              borderLeft: `3px solid ${msg.role === 'user' ? 'var(--accent-i)' : 'var(--accent-a)'}`
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                {msg.role === 'user' ? 'Você' : 'Assistente'}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ProfileView ───────────────────────────────────────────────────────────────

function ProfileView({ user, prefs, onSignOut, onOpenWizard }) {
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState(prefs?.display_name || '');
  const [saving, setSaving] = useState(false);

  async function handleSaveName() {
    // Será salvo via wizard ou diretamente se necessário
    setEditName(false);
  }

  return (
    <div style={{ padding: '0 24px 24px', maxWidth: 480 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Perfil</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Avatar + email */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--accent-i)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#fff'
          }}>
            {user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {prefs?.display_name || user?.user_metadata?.display_name || 'Professor'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
        </div>

        {/* Turmas */}
        {prefs?.turmas && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Turmas
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {prefs.turmas.slice(0, prefs.turma_count || 2).map((t, i) => (
                <span key={i} style={{
                  background: ['var(--accent-i)22','var(--accent-a)22','var(--accent-b)22'][i] || 'var(--surface2)',
                  color: ['var(--accent-i)','var(--accent-a)','var(--accent-b)'][i] || 'var(--text)',
                  border: `1px solid ${['var(--accent-i)44','var(--accent-a)44','var(--accent-b)44'][i] || 'var(--border)'}`,
                  borderRadius: 6, fontSize: 12, fontWeight: 600, padding: '4px 10px'
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onOpenWizard} style={{ justifyContent: 'flex-start' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Editar configurações
          </button>
          <button className="btn btn-danger" onClick={onSignOut} style={{ justifyContent: 'flex-start' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PublicScheduleOverlay ─────────────────────────────────────────────────────

function PublicScheduleOverlay({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userId]);

  async function loadData() {
    try {
      const [prefsRes, cardsRes] = await Promise.all([
        supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_card_content').select('*').eq('user_id', userId)
      ]);
      setData({ prefs: prefsRes.data, cards: cardsRes.data || [] });
    } catch (err) {
      console.error('PublicScheduleOverlay error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide" style={{ maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>
            {data?.prefs?.display_name || 'Cronograma Público'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Carregando...</div>
        ) : !data ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Cronograma não encontrado.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(data.cards || []).map(card => (
              <div key={card.card_id} style={{
                background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px',
                borderLeft: '3px solid var(--accent-i)'
              }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{card.title || '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {card.card_id} {card.lesson_date && `• ${card.lesson_date}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const { user, loading: authLoading, signIn, signUp, signOut, signInWithGoogle } = useAuth();
  const { cards, loading: cardsLoading, loadCards, saveCard, deleteCard } = useCards(user);
  const { prefs, loading: prefsLoading, savePreferences, calcCalendar, getCalendarDate, reload: reloadPrefs } = usePreferences(user);
  const { messages, streaming, sendMessage, clearHistory, loadChatHistory } = useChat(user);
  const { suggestions, loading: suggestionsLoading, loadSuggestions, approveSuggestion, rejectSuggestion } = useAiSuggestions(saveCard);

  const [activeTab, setActiveTab] = useState('schedule');
  const [activeCycle, setActiveCycle] = useState(0); // 0 = primeiro ciclo/coluna
  const [selectedCard, setSelectedCard] = useState(null); // { id, mode: 'detail' | 'edit' }
  const [showWizard, setShowWizard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [publicOverlay, setPublicOverlay] = useState(null); // userId

  const isOwner = user?.email === MAIN_TEMPLATE_EMAIL;
  const today = isoToday();
  const calendarJson = prefs ? calcCalendar(prefs) : {};
  const columns = prefs ? buildColumns(prefs) : [];

  // Carregar dados ao autenticar
  useEffect(() => {
    if (user) {
      loadCards(user.id, isOwner);
      loadChatHistory(user.id);
    }
  }, [user]);

  // Mostrar wizard se não tiver prefs configuradas (não-owner)
  useEffect(() => {
    if (user && !isOwner && !prefsLoading && !prefs) {
      setShowWizard(true);
    }
  }, [user, prefs, prefsLoading]);

  function addToast(msg, type = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
  }

  function removeToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (err) {
      addToast('Erro ao sair: ' + err.message, 'error');
    }
  }

  async function handleSaveCard(cardId, data) {
    try {
      await saveCard(cardId, data);
      addToast('Card salvo!', 'success');
    } catch (err) {
      addToast('Erro ao salvar: ' + err.message, 'error');
      throw err;
    }
  }

  async function handleToggleDone(cardId, done) {
    const current = cards[cardId] || {};
    try {
      await saveCard(cardId, { ...current, done });
      addToast(done ? 'Aula marcada como concluída!' : 'Aula desmarcada.', 'success');
    } catch (err) {
      addToast('Erro ao atualizar.', 'error');
    }
  }

  async function handleSavePreferences(prefsData) {
    try {
      await savePreferences(prefsData);
      await loadCards(user.id, isOwner);
      addToast('Configurações salvas!', 'success');
    } catch (err) {
      addToast('Erro ao salvar configurações: ' + err.message, 'error');
      throw err;
    }
  }

  // Importar Excel
  async function handleImportExcel(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      let imported = 0;
      for (let i = 1; i < rows.length && i <= 40; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;
        const cardId = `imported_${i}`;
        await saveCard(cardId, {
          title: String(row[1] || row[0] || '').slice(0, 120),
          description: String(row[2] || '').slice(0, 500),
          tags: [],
          done: false,
          activityLink: '',
          lessonDate: null
        });
        imported++;
      }
      addToast(`${imported} aulas importadas!`, 'success');
    } catch (err) {
      addToast('Erro ao importar: ' + err.message, 'error');
    }
    e.target.value = '';
  }

  // Aprovar sugestão — aplica ao card
  async function handleApproveSuggestion(suggestion) {
    const current = cards[suggestion.card_id] || {};
    const tmpl = D[suggestion.card_id] || {};
    const updated = {
      title: current.title || tmpl.t || '',
      description: current.description || (tmpl.tp || []).join('\n'),
      tags: current.tags || [],
      done: current.done || false,
      activityLink: current.activityLink || '',
      lessonDate: current.lessonDate || null
    };
    if (suggestion.field === 'title') updated.title = suggestion.value;
    if (suggestion.field === 'description') updated.description = suggestion.value;
    try {
      await saveCard(suggestion.card_id, updated);
      await approveSuggestion(suggestion);
      addToast('Sugestão aplicada!', 'success');
    } catch (err) {
      addToast('Erro ao aplicar sugestão.', 'error');
    }
  }

  async function handleApproveAllSuggestions() {
    for (const sug of suggestions) {
      await handleApproveSuggestion(sug);
    }
  }

  // ── Render: não autenticado ───────────────────────────────────────────────

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinning" style={{
          width: 32, height: 32,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent-i)',
          borderRadius: '50%'
        }} />
      </div>
    );
  }

  if (!user) {
    return <LandingPage onSignIn={signIn} onSignUp={signUp} onGoogleSignIn={signInWithGoogle} />;
  }

  // ── Render: autenticado ───────────────────────────────────────────────────

  const CHAT_SYSTEM_PROMPT = `Você é um assistente pedagógico especializado em cursos de informática para adultos no FIEC.
Ajude a professora com dúvidas sobre conteúdo de aulas, organização do cronograma, atividades e ferramentas educacionais.
Responda em português do Brasil, de forma clara e prática.
Turmas: ${prefs?.turmas?.join(', ') || 'Intermediário, Avançado'}.`;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userEmail={user.email}
      />

      {/* Main content */}
      <div style={{ marginLeft: 60, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Topbar */}
        <header style={{
          height: 56, display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 12,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
          position: 'sticky', top: 0, zIndex: 40
        }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {activeTab === 'schedule' && 'Cronograma'}
            {activeTab === 'gallery' && 'Galeria'}
            {activeTab === 'history' && 'Histórico'}
            {activeTab === 'suggestions' && 'Sugestões de IA'}
            {activeTab === 'profile' && 'Perfil'}
          </div>

          {/* Pills de turmas (só na view schedule) */}
          {activeTab === 'schedule' && columns.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
              {columns.map((col, i) => (
                <button
                  key={i}
                  onClick={() => setActiveCycle(i)}
                  style={{
                    padding: '3px 12px', borderRadius: 20, cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, border: '1px solid',
                    borderColor: activeCycle === i
                      ? ['var(--accent-i)','var(--accent-a)','var(--accent-b)'][i]
                      : 'var(--border)',
                    background: activeCycle === i
                      ? ['var(--accent-i)22','var(--accent-a)22','var(--accent-b)22'][i]
                      : 'transparent',
                    color: activeCycle === i
                      ? ['var(--accent-i)','var(--accent-a)','var(--accent-b)'][i]
                      : 'var(--text-muted)',
                    transition: 'all 0.15s'
                  }}
                >
                  {col.name}
                </button>
              ))}
            </div>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Importar Excel */}
            {activeTab === 'schedule' && (
              <label className="btn btn-ghost" style={{ cursor: 'pointer', fontSize: 12 }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/>
                </svg>
                Excel
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} style={{ display: 'none' }} />
              </label>
            )}

            {/* Botão Chat */}
            <button
              className={`btn ${showChat ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setShowChat(!showChat)}
              style={{ fontSize: 12 }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Chat IA
            </button>
          </div>
        </header>

        {/* Views */}
        <main style={{ flex: 1, padding: 20 }}>

          {/* ── Schedule View ──────────────────────────────────────────────── */}
          {activeTab === 'schedule' && (
            <div>
              {cardsLoading || prefsLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Carregando cronograma...</div>
              ) : !prefs ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 16 }}>
                    Configure seu cronograma para começar.
                  </p>
                  <button className="btn btn-primary" onClick={() => setShowWizard(true)}>
                    Configurar agora
                  </button>
                </div>
              ) : (
                <div>
                  {/* Vista de coluna única ou múltipla */}
                  {columns.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>Nenhuma turma configurada.</p>
                  ) : (
                    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
                      {columns.map((col, colIdx) => {
                        // Mostrar todas as colunas no desktop, filtrar por activeCycle em mobile
                        const colAccent = ['var(--accent-i)','var(--accent-a)','var(--accent-b)'][colIdx] || 'var(--accent-i)';
                        const dateKeys = col.keys.map(id => getCalendarDate(id, calendarJson));

                        // Separar passadas / próximas
                        const pastIds = [];
                        const upcomingIds = [];
                        col.keys.forEach((id, i) => {
                          const dt = dateKeys[i];
                          if (dt && dt < today) pastIds.push(id);
                          else upcomingIds.push(id);
                        });

                        return (
                          <div
                            key={colIdx}
                            style={{
                              minWidth: 280, maxWidth: 340, flex: '1 0 280px',
                              display: colIdx === activeCycle || window.innerWidth > 900 ? 'flex' : 'none',
                              flexDirection: 'column', gap: 0
                            }}
                          >
                            <div style={{
                              fontSize: 12, fontWeight: 700, color: colAccent,
                              textTransform: 'uppercase', letterSpacing: '0.06em',
                              marginBottom: 12, padding: '0 2px'
                            }}>
                              {col.name}
                            </div>

                            {/* Aulas passadas */}
                            {pastIds.length > 0 && (
                              <>
                                <div className="section-sep">Passadas</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                                  {pastIds.map(id => {
                                    const idxInCol = col.keys.indexOf(id);
                                    const dt = dateKeys[idxInCol];
                                    const cardData = cards[id] || {};
                                    const tmpl = D[id] || {};
                                    return (
                                      <LessonCard
                                        key={id}
                                        cardId={id}
                                        cardData={cardData}
                                        templateData={tmpl}
                                        dateStr={cardData.lessonDate || dt}
                                        isPast
                                        onClick={() => setSelectedCard({ id, mode: 'detail' })}
                                      />
                                    );
                                  })}
                                </div>
                              </>
                            )}

                            {/* Aulas próximas */}
                            {upcomingIds.length > 0 && (
                              <>
                                {pastIds.length > 0 && <div className="section-sep">Próximas</div>}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {upcomingIds.map(id => {
                                    const idxInCol = col.keys.indexOf(id);
                                    const dt = dateKeys[idxInCol];
                                    const cardData = cards[id] || {};
                                    const tmpl = D[id] || {};
                                    return (
                                      <LessonCard
                                        key={id}
                                        cardId={id}
                                        cardData={cardData}
                                        templateData={tmpl}
                                        dateStr={cardData.lessonDate || dt}
                                        isPast={false}
                                        onClick={() => setSelectedCard({ id, mode: 'detail' })}
                                      />
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Gallery View ────────────────────────────────────────────────── */}
          {activeTab === 'gallery' && (
            <GalleryView onOpenPublic={uid => setPublicOverlay(uid)} />
          )}

          {/* ── History View ─────────────────────────────────────────────────── */}
          {activeTab === 'history' && (
            <HistoryView messages={messages} onClear={clearHistory} />
          )}

          {/* ── Suggestions View ─────────────────────────────────────────────── */}
          {activeTab === 'suggestions' && (
            <SuggestionPanel
              suggestions={suggestions}
              loading={suggestionsLoading}
              onLoad={loadSuggestions}
              onApprove={handleApproveSuggestion}
              onReject={rejectSuggestion}
              onApproveAll={handleApproveAllSuggestions}
              cards={cards}
              prefs={prefs}
            />
          )}

          {/* ── Profile View ─────────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <ProfileView
              user={user}
              prefs={prefs}
              onSignOut={handleSignOut}
              onOpenWizard={() => setShowWizard(true)}
            />
          )}
        </main>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {selectedCard?.mode === 'detail' && (
        <DetailModal
          cardId={selectedCard.id}
          cardData={cards[selectedCard.id] || {}}
          templateData={D[selectedCard.id] || {}}
          dateStr={
            (cards[selectedCard.id]?.lessonDate) ||
            getCalendarDate(selectedCard.id, calendarJson)
          }
          onClose={() => setSelectedCard(null)}
          onEdit={(id) => setSelectedCard({ id, mode: 'edit' })}
          onToggleDone={handleToggleDone}
        />
      )}

      {selectedCard?.mode === 'edit' && (
        <EditModal
          cardId={selectedCard.id}
          cardData={cards[selectedCard.id] || {}}
          templateData={D[selectedCard.id] || {}}
          onClose={() => setSelectedCard(null)}
          onSave={handleSaveCard}
        />
      )}

      {showWizard && (
        <Wizard
          initialPrefs={prefs}
          onClose={() => setShowWizard(false)}
          onSave={handleSavePreferences}
        />
      )}

      {publicOverlay && (
        <PublicScheduleOverlay
          userId={publicOverlay}
          onClose={() => setPublicOverlay(null)}
        />
      )}

      {/* ── Chat flutuante ───────────────────────────────────────────────── */}
      <ChatBox
        open={showChat}
        onClose={() => setShowChat(false)}
        messages={messages}
        streaming={streaming}
        onSend={(text) => sendMessage(text, CHAT_SYSTEM_PROMPT)}
        onClear={clearHistory}
      />

      {/* ── Toasts ──────────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 200 }}>
        {toasts.map(t => (
          <Toast key={t.id} msg={t.msg} type={t.type} onDone={() => removeToast(t.id)} />
        ))}
      </div>
    </div>
  );
}
