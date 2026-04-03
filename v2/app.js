// ── CONFIG ──
window.APP_CONFIG = window.APP_CONFIG || {};
const SUPABASE_URL = window.APP_CONFIG.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.APP_CONFIG.SUPABASE_ANON_KEY || '';
const MAIN_TEMPLATE_EMAIL = 'pcdsantos007@gmail.com';
const GEMINI_API_KEY = window.APP_CONFIG.GEMINI_API_KEY || '';
const GEMINI_MODEL = window.APP_CONFIG.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';

let sb = null, currentUser = null, userPreferences = null;
const userCards = {};
let authMode = 'login';
let selectedTag = '';
let editingCardId = null;
let suggestionsPending = [];
let _sessionApplying = false;
let currentCycle = 1;
let chatHistory = [];

// ── HELPERS ──
function escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

let _toastTimer;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast show${type ? ' ' + type : ''}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

function closeAllModals() {
  ['detail-modal', 'edit-modal', 'onb-modal'].forEach(id => document.getElementById(id)?.classList.remove('open'));
  document.body.style.overflow = '';
}

function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ── DATE HELPERS ──
const FERIADOS_2026 = new Set(['2026-01-01', '2026-03-03', '2026-04-03', '2026-04-05', '2026-04-20', '2026-04-21', '2026-05-01', '2026-06-11', '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15', '2026-12-25']);

function calcLessonDates(startDate, weekdays, count = 33) {
  if (!startDate || !weekdays || !weekdays.length) return {};
  const result = {}, wdSet = new Set(weekdays.map(Number));
  // Usa partes da data diretamente para evitar problema de timezone
  const [sy, sm, sd] = startDate.split('-').map(Number);
  let cur = new Date(sy, sm - 1, sd); // date local sem UTC offset
  let lesson = 1, max = 500;
  while (lesson <= count && max-- > 0) {
    const y = cur.getFullYear(), mo = cur.getMonth() + 1, d = cur.getDate();
    const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (wdSet.has(cur.getDay()) && !FERIADOS_2026.has(iso)) { result[`lesson_${lesson}`] = iso; lesson++; }
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

function getCalendarDate(cardId) {
  if (!userPreferences?.calendar_json) return '';
  const cal = userPreferences.calendar_json;
  if (cardId === 'enc') return cal['t0_lesson_20'] || cal['lesson_20'] || '';
  const m = cardId.match(/^([iabcde])(\d+)$/);
  if (!m) return '';
  const idx = (['i', 'c'].includes(m[1])) ? 0 : (['a', 'd'].includes(m[1])) ? 1 : 2;
  return cal[`t${idx}_lesson_${m[2]}`] || cal[`lesson_${m[2]}`] || '';
}

function formatDateBR(iso) {
  if (!iso) return { day: '', mo: '', wd: '' };
  const parts = iso.split('-');
  const dt = new Date(iso + 'T00:00:00');
  if (isNaN(dt.getTime())) return { day: parts[2] || '', mo: parts[1] || '', wd: '' };
  return {
    day: parts[2],
    mo: ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][+parts[1]],
    wd: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dt.getDay()]
  };
}

// ── SUPABASE INIT ──
async function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { console.warn('APP_CONFIG não configurado'); showLanding(); return; }
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const hash = window.location.hash;
  if (hash && (hash.includes('access_token') || hash.includes('type=signup') || hash.includes('type=recovery'))) {
    window.history.replaceState(null, '', window.location.pathname);
  }
  // Register BEFORE getSession so OAuth redirect SIGNED_IN events are never missed
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'INITIAL_SESSION' || _sessionApplying || event === 'TOKEN_REFRESHED') return;
    if (session?.user) {
      if (currentUser && currentUser.id === session.user.id) return;
      await applySession(session.user);
    } else {
      currentUser = null; userPreferences = null;
      Object.keys(userCards).forEach(k => delete userCards[k]);
      showLanding();
    }
  });
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) await applySession(session.user);
  else showLanding();
}

async function applySession(user) {
  if (_sessionApplying) return;
  _sessionApplying = true;
  currentUser = user;
  Object.keys(userCards).forEach(k => delete userCards[k]);
  showApp();
  try {
    await ensurePreferences();
    await loadUserCards();
    await loadAiSuggestions();
    await loadChatFromDB();
    updateProfileView();
  } catch (e) {
    console.error('applySession:', e);
    showToast('Erro ao carregar: ' + e.message, 'err');
  } finally {
    _sessionApplying = false;
  }
}

// ── UI ──
function showLanding() {
  document.getElementById('landing').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('chat-fab-top').style.display = 'none';
  document.getElementById('main-sidebar').style.display = 'none';
  document.body.classList.remove('logged-in');
  document.getElementById('auth-modal')?.classList.remove('open');
  const msg = document.getElementById('auth-msg');
  if (msg) { msg.className = 'auth-msg'; msg.textContent = ''; }
}

function showApp() {
  document.getElementById('landing').style.display = 'none';
  document.getElementById('auth-modal')?.classList.remove('open');
  document.getElementById('app').style.display = 'flex';
  document.getElementById('chat-fab-top').style.display = '';
  document.getElementById('main-sidebar').style.display = 'flex';
  document.body.classList.add('logged-in');
  const u = currentUser?.email?.[0]?.toUpperCase() || '?';
  document.querySelectorAll('.sidebar-user').forEach(el => el.textContent = u);
  document.getElementById('topbar-title').innerHTML =
    `Meu Cronograma <span>${escHtml(currentUser?.user_metadata?.display_name || currentUser?.email || '')}</span>`;
}

function openAuthModal(mode = 'login') {
  authMode = mode;
  document.getElementById('auth-title').textContent = mode === 'login' ? 'Entrar' : 'Criar conta';
  document.getElementById('auth-submit').textContent = mode === 'login' ? 'Entrar' : 'Criar conta';
  document.getElementById('auth-name-group').style.display = mode === 'register' ? '' : 'none';
  document.getElementById('auth-toggle').textContent = mode === 'login' ? 'Criar conta' : 'Já tenho conta';
  const msg = document.getElementById('auth-msg');
  if (msg) { msg.className = 'auth-msg'; msg.textContent = ''; }
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-pass').value = '';
  document.getElementById('auth-modal').classList.add('open');
  setTimeout(() => document.getElementById('auth-email').focus(), 100);
}

function switchView(tab) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`view-${tab}`)?.classList.add('active');
  document.querySelector(`.nav-btn[data-tab="${tab}"]`)?.classList.add('active');
  if (tab === 'gallery') loadPublicSchedules();
  if (tab === 'profile') updateProfileView();
  if (tab === 'history') loadChatHistory();
  if (tab === 'suggestions') { document.getElementById('sugg-panel').classList.add('open'); renderAiSuggestions(); return; }
  document.getElementById('sugg-panel').classList.remove('open');
}

// ── SCHEDULE RENDER — só banco, sem template hardcoded ──
function renderSchedule() {
  const prefs = userPreferences;
  const turmas = prefs?.turmas_json || ['Turma 1', 'Turma 2'];
  const moduleCount = prefs?.module_count || 1;
  const cycleBar = document.getElementById('cycle-bar');

  if (moduleCount >= 2) {
    cycleBar.classList.add('visible');
    document.getElementById('cycle-btn-1').className = 'cycle-tab c1';
    document.getElementById('cycle-btn-2').className = 'cycle-tab' + (currentCycle === 2 ? ' c2' : '');
    document.getElementById('cycle-label').textContent = `Módulo ${moduleCount}`;
  } else {
    cycleBar.classList.remove('visible');
    currentCycle = 1;
  }

  const prefix1 = currentCycle === 2 ? 'c' : 'i';
  const prefix2 = currentCycle === 2 ? 'd' : 'a';
  const prefix3 = currentCycle === 2 ? 'e' : 'b';
  const turmaCount = prefs?.turma_count || turmas.length || 1;

  const startLabel = prefs?.start_date ? ` · ${formatDateBR(prefs.start_date).day}/${formatDateBR(prefs.start_date).mo}` : '';
  document.getElementById('col-i-name').textContent = (turmas[0] || 'Turma 1') + startLabel;
  document.getElementById('col-a-name').textContent = (turmas[1] || 'Turma 2') + startLabel;
  document.getElementById('col-b-name').textContent = turmas[2] || 'Turma 3';
  document.getElementById('col-a').style.display = turmaCount >= 2 ? '' : 'none';
  document.getElementById('col-b').style.display = turmaCount >= 3 ? '' : 'none';
  document.getElementById('main-grid').classList.toggle('cols-3', turmaCount >= 3);
  // Força largura do grid via style para 1 turma
  const mainGrid = document.getElementById('main-grid');
  if (turmaCount === 1) mainGrid.style.gridTemplateColumns = '1fr';
  else if (turmaCount >= 3) mainGrid.style.gridTemplateColumns = '';
  else mainGrid.style.gridTemplateColumns = '1fr 1fr';
  document.getElementById('wizard-btn').style.display = currentUser ? '' : 'none';
  document.getElementById('setup-banner').style.display = (!prefs && currentUser) ? 'flex' : 'none';

  renderCol(prefix1);
  if (turmaCount >= 2) renderCol(prefix2);
  if (turmaCount >= 3) renderCol(prefix3);
  updatePills();
}

function colPrefixToUi(col) {
  return (['i', 'c'].includes(col)) ? 'i' : (['a', 'd'].includes(col)) ? 'a' : 'b';
}

function renderCol(col) {
  const uiCol = colPrefixToUi(col);
  const container = document.getElementById(`cards-${uiCol}`);
  const addBtn = document.getElementById(`add-${uiCol}`);
  if (!container) return;
  container.innerHTML = '';

  // Filtra os cards do banco que pertencem a esta coluna
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let pastSepAdded = false, upcomingAdded = false, shown = 0;

  // Gera lista de IDs esperados para esta coluna (i1..i20, enc etc)
  const expectedIds = [];
  for (let n = 1; n <= 20; n++) expectedIds.push(`${col}${n}`);
  if (['i', 'a', 'b'].includes(col)) expectedIds.push('enc');

  expectedIds.forEach(id => {
    const card = userCards[id];
    if (!card) return; // sem dado no banco = não mostra

    const dateStr = card.lessonDate || getCalendarDate(id);
    const dt = dateStr ? new Date(dateStr + 'T00:00:00') : null;
    const isPast = dt && dt < today;

    if (dateStr) {
      if (isPast && !pastSepAdded) {
        const sep = document.createElement('div');
        sep.className = 'sep'; sep.textContent = 'Passadas';
        container.appendChild(sep); pastSepAdded = true;
      } else if (!isPast && pastSepAdded && !upcomingAdded) {
        const sep = document.createElement('div');
        sep.className = 'sep'; sep.textContent = 'Próximas';
        container.appendChild(sep); upcomingAdded = true;
      }
    }

    container.appendChild(buildCard(id, uiCol, card, dateStr, dt));
    shown++;
  });

  // Empty state
  if (shown === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `<p>Nenhuma aula ainda.<br>Clique em <strong>+ Adicionar aula</strong> para começar.</p>`;
    container.appendChild(empty);
  }

  document.getElementById(`col-${uiCol}-count`).textContent = `${shown} aula${shown !== 1 ? 's' : ''}`;
  if (addBtn) addBtn.style.display = currentUser ? '' : 'none';
}

function buildCard(id, col, card, dateStr, dt) {
  const lc = document.createElement('div');
  const isEnc = id === 'enc';
  const isDone = card.done || (dt && dt < new Date());
  lc.className = `lc${isDone ? ' done' : ''}${isEnc ? ' enc-card' : ''}`;
  lc.dataset.id = id;

  let dateHtml = '';
  if (dateStr && dt) {
    const { day, mo, wd } = formatDateBR(dateStr);
    dateHtml = `<div class="lc-day">${day}</div><div class="lc-month">${mo}</div><div class="lc-wd">${wd}</div>`;
  } else {
    const num = id.match(/\d+/)?.[0] || '';
    dateHtml = `<div class="lc-no-date">#${num}</div>`;
  }

  const title = card.title || id;
  const desc = card.description || '';
  const tag = card.tags || '';
  const num = id.match(/\d+/)?.[0] || '';

  lc.innerHTML = `
    <div class="lc-date">${dateHtml}</div>
    <div class="lc-body">
      <div class="lc-title">${escHtml(title)}</div>
      ${desc ? `<div class="lc-desc">${escHtml(desc.split('\n')[0])}</div>` : ''}
    </div>
    <div class="lc-right">
      <span class="lc-num">#${num}</span>
      ${tag ? `<div class="tag-dot ${tag}"></div>` : ''}
    </div>`;

  lc.addEventListener('click', () => openDetail(id, col));
  return lc;
}

function updatePills() {
  const row = document.getElementById('pill-row');
  if (!userPreferences) { row.innerHTML = ''; return; }
  const turmas = userPreferences.turmas_json || ['Turma 1', 'Turma 2'];
  const iCount = document.getElementById('col-i-count')?.textContent || '';
  const aCount = document.getElementById('col-a-count')?.textContent || '';
  const bCount = document.getElementById('col-b-count')?.textContent || '';
  let html = `<div class="pill pill-i">${escHtml(turmas[0] || 'Turma 1')} · ${iCount}</div>
              <div class="pill pill-a">${escHtml(turmas[1] || 'Turma 2')} · ${aCount}</div>`;
  if (turmas.length >= 3) html += `<div class="pill pill-b">${escHtml(turmas[2] || 'Turma 3')} · ${bCount}</div>`;
  row.innerHTML = html;
}

// ── DETAIL MODAL ──
function openDetail(id, col) {
  const card = userCards[id];
  if (!card) return;
  const uiCol = (['i', 'c'].includes(col)) ? 'i' : 'a';
  const colLabel = uiCol === 'i'
    ? (userPreferences?.turmas_json?.[0] || 'Turma 1')
    : (userPreferences?.turmas_json?.[1] || 'Turma 2');

  document.getElementById('detail-col-label').textContent = colLabel;

  const dateStr = card.lessonDate || getCalendarDate(id);
  const title = card.title || id;
  const tag = card.tags || '';
  const topics = card.description ? card.description.split('\n').filter(Boolean) : [];
  const actLink = card.activityLink || '';

  let h = '';
  if (dateStr) h += `<div class="detail-date">${dateStr}</div>`;
  h += `<div class="detail-title">${escHtml(title)}</div>`;
  if (tag) h += `<div class="detail-tag ${tag}">${tag.charAt(0).toUpperCase() + tag.slice(1)}</div>`;

  if (topics.length) {
    h += `<div class="detail-section"><div class="detail-section-label">Conteúdo</div>`;
    topics.forEach(t => h += `<div class="detail-topic"><div class="detail-bullet"></div><span>${escHtml(t)}</span></div>`);
    h += `</div>`;
  }

  if (actLink) {
    h += `<div class="detail-section"><div class="detail-section-label">Atividade</div>`;
    h += `<a class="detail-link" href="${escHtml(actLink)}" target="_blank" rel="noopener">🔗 Abrir atividade</a>`;
    h += `<iframe src="${toGoogleEmbedUrl(actLink)}" class="detail-iframe" allow="autoplay"></iframe></div>`;
  }

  const body = document.getElementById('detail-body');
  body.className = `modal-body ${uiCol}`;
  body.innerHTML = h;
  document.getElementById('detail-modal').dataset.col = col;
  document.getElementById('detail-edit').style.display = '';
  document.getElementById('detail-edit').onclick = () => { closeAllModals(); editCard(id); };
  // Botão "Concluída / Desfazer"
  const doneBtn = document.getElementById('detail-done');
  const isDoneNow = card?.done || false;
  doneBtn.style.display = '';
  doneBtn.textContent = isDoneNow ? '↩ Desfazer conclusão' : '✓ Marcar como concluída';
  doneBtn.className = isDoneNow ? 'btn btn-ghost' : 'btn btn-done';
  doneBtn.onclick = () => toggleDone(id);
  // Botão "Excluir"
  const delBtn = document.getElementById('detail-delete');
  delBtn.style.display = '';
  delBtn.onclick = () => deleteCard(id);
  openModal('detail-modal');
}
window.openDetail = openDetail;

async function deleteCard(id) {
  if (!currentUser || !confirm('Remover o conteúdo desta aula?')) return;
  try {
    await sb.from('user_card_content').delete()
      .eq('user_id', currentUser.id)
      .eq('card_id', id);
    delete userCards[id];
    const isOwner = currentUser.email === MAIN_TEMPLATE_EMAIL;
    renderSchedule(isOwner);
    closeAllModals();
    showToast('✓ Aula removida', 'ok');
  } catch (e) {
    showToast(e.message, 'err');
  }
}

function toGoogleEmbedUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url), h = u.hostname;
    if (h.includes('docs.google.com') || h.includes('sheets.google.com'))
      return url.replace(/\/(edit|view|pub)(#.*)?$/, '/preview');
    if (h.includes('drive.google.com')) {
      const m = url.match(/\/file\/d\/([^/]+)/);
      if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
    }
  } catch { }
  return url;
}

// ── EDIT CARD ──
function editCard(id) {
  editingCardId = id;
  const card = userCards[id] || {};
  const titleInput = document.getElementById('edit-title');
  const descInput = document.getElementById('edit-desc');
  const linkInput = document.getElementById('edit-link');
  const dateInput = document.getElementById('edit-date');
  if (titleInput) titleInput.value = card.title || '';
  if (descInput) descInput.value = card.description || '';
  if (linkInput) linkInput.value = card.activityLink || '';
  if (dateInput) dateInput.value = card.lessonDate || getCalendarDate(id) || '';
  setTagSel(card.tags || '');
  openModal('edit-modal');
}

function setTagSel(tag) {
  selectedTag = tag || '';
  document.querySelectorAll('#edit-tags .tag-btn').forEach(b => {
    b.className = 'tag-btn';
    if (b.dataset.tag === selectedTag) b.classList.add(`sel-${selectedTag}`);
  });
}

document.querySelectorAll('#edit-tags .tag-btn').forEach(b => {
  b.addEventListener('click', () => { const t = b.dataset.tag; setTagSel(selectedTag === t ? '' : t); });
});

// ── SALVAR CARD — sem timeout artificial ──
document.getElementById('edit-save').addEventListener('click', async () => {
  if (!currentUser) { showToast('Faça login primeiro', 'err'); return; }
  if (!sb) { showToast('Supabase não conectado', 'err'); return; }
  if (!editingCardId) { showToast('Nenhuma aula selecionada', 'err'); return; }

  const btn = document.getElementById('edit-save');
  btn.disabled = true; btn.textContent = 'Salvando...';

  const titleVal = (document.getElementById('edit-title')?.value || '').trim();
  const descVal = (document.getElementById('edit-desc')?.value || '').trim();
  const linkVal = (document.getElementById('edit-link')?.value || '').trim();
  const dateVal = document.getElementById('edit-date')?.value || '';

  if (!titleVal) { showToast('Preencha o título da aula', 'err'); btn.disabled = false; btn.textContent = 'Salvar aula'; return; }

  const row = {
    user_id: currentUser.id,
    card_id: editingCardId,
    title: titleVal,
    description: descVal,
    activity_link: linkVal || null,
    lesson_date: dateVal || null,
    tags: selectedTag || null,
    updated_at: new Date().toISOString()
  };

  try {
    await upsertCard(row);
    userCards[editingCardId] = {
      title: row.title, description: row.description,
      activityLink: row.activity_link || '', lessonDate: row.lesson_date || '', tags: row.tags || ''
    };
    const col = (['c', 'i'].includes(editingCardId[0])) ? colPrefixToUi(editingCardId[0]) :
      (['d', 'a'].includes(editingCardId[0])) ? 'a' : 'b';
    renderCol(editingCardId[0]); // re-renderiza a coluna certa
    updatePills();
    closeAllModals();
    showToast('✓ Aula salva!', 'ok');
  } catch (e) {
    showToast('Erro ao salvar: ' + e.message, 'err');
    console.error('edit-save error:', e);
  }
  btn.disabled = false; btn.textContent = 'Salvar aula';
});

// ── UPSERT — sem timeout artificial ──
async function upsertCard(row) {
  if (!sb || !currentUser) throw new Error('Não autenticado');
  const { error } = await sb.from('user_card_content').upsert(row, { onConflict: 'user_id,card_id' });
  if (!error) return;
  // fallback: delete + insert
  await sb.from('user_card_content').delete().eq('user_id', row.user_id).eq('card_id', row.card_id);
  const { error: e2 } = await sb.from('user_card_content').insert(row);
  if (e2) throw new Error(e2.message);
}

// ── LOAD USER CARDS — direto do banco, sem fallback de template ──
async function loadUserCards() {
  if (!currentUser || !sb) return;
  const { data, error } = await sb
    .from('user_card_content')
    .select('card_id,title,description,activity_link,lesson_date,tags,done')
    .eq('user_id', currentUser.id);

  if (error) {
    console.error('loadUserCards:', error.message);
    showToast('Erro ao carregar aulas: ' + error.message, 'err');
    renderSchedule();
    return;
  }

  (data || []).forEach(r => {
    userCards[r.card_id] = {
      title: r.title,
      description: r.description,
      activityLink: r.activity_link || '',
      lessonDate: r.lesson_date || '',
      tags: r.tags || '',
      done: r.done || false
    };
  });

  renderSchedule();
}

// ── PREFERENCES ──
async function ensurePreferences() {
  if (!currentUser || !sb) return;
  const { data, error } = await sb.from('user_preferences').select('*').eq('user_id', currentUser.id).maybeSingle();
  if (error) console.warn('ensurePreferences:', error.message);
  if (data) {
    userPreferences = data;
    applyCalendarDates();
    renderSchedule();
    updateProfileView();
  } else {
    renderSchedule();
    openWizard();
  }
}

function applyCalendarDates() {
  if (!userPreferences?.start_date) return;
  let wdPerTurma = userPreferences.weekdays_json || [[1, 3], [2, 4]];
  if (!Array.isArray(wdPerTurma[0])) wdPerTurma = [wdPerTurma, wdPerTurma];
  const cal = {};
  wdPerTurma.forEach((wd, idx) => {
    if (!wd?.length) return;
    const dates = calcLessonDates(userPreferences.start_date, wd, 33);
    Object.entries(dates).forEach(([k, v]) => { cal[`t${idx}_${k}`] = v; });
  });
  userPreferences.calendar_json = cal;
}

// ── SAVE PREFERENCES — sem timeout artificial ──
async function savePreferences(prefs) {
  if (!currentUser || !sb) return 'Não autenticado';
  const row = {
    user_id: currentUser.id,
    turma_count: prefs.turmaCount || 1,
    cycle_type: prefs.cycleType || 'mod12',
    module_count: prefs.moduleCount || 1,
    start_date: prefs.startDate || null,
    turmas_json: prefs.turmas || [],
    allow_ai_edits: prefs.allowAiEdits || false,
    weekdays_json: prefs.weekdays || [[1, 3], [2, 4]],
    calendar_json: prefs.calendarJson || {},
    display_name: prefs.displayName || null,
    updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('user_preferences').upsert(row, { onConflict: 'user_id' });
  if (!error) return null;
  // fallback delete+insert
  await sb.from('user_preferences').delete().eq('user_id', currentUser.id).then(() => { }).catch(() => { });
  const { error: e2 } = await sb.from('user_preferences').insert(row);
  return e2 ? e2.message : null;
}

// ── WIZARD ──
let onbStep = 1;
const ONB_TOTAL = 5;

function openWizard() {
  onbStep = 1;
  const p = userPreferences;
  document.getElementById('onb-start').value = p?.start_date || '';
  document.getElementById('onb-display-name').value = p?.display_name || currentUser?.user_metadata?.display_name || '';
  ['onb-cycle', 'onb-mods', 'onb-turma-count', 'onb-ai'].forEach(gId => {
    const map = {
      'onb-cycle': p?.cycle_type || 'mod12', 'onb-mods': String(p?.module_count || 1),
      'onb-turma-count': String(p?.turma_count || 1), 'onb-ai': String(p?.allow_ai_edits || false)
    };
    document.querySelectorAll(`#${gId} .seg-btn`).forEach(b => b.classList.toggle('sel', b.dataset.val === map[gId]));
  });
  let wdPerTurma = p?.weekdays_json || [[1, 3], [2, 4]];
  if (!Array.isArray(wdPerTurma[0])) wdPerTurma = [wdPerTurma, wdPerTurma];
  renderTurmaFields(Number(p?.turma_count || 1), p?.turmas_json || [], wdPerTurma);
  renderWizardStep();
  const msg = document.getElementById('onb-msg');
  if (msg) { msg.className = 'onb-msg'; msg.textContent = ''; }
  openModal('onb-modal');
}

function renderTurmaFields(count, names = [], wdPerTurma = []) {
  const container = document.getElementById('onb-turmas');
  container.innerHTML = '';
  const DAYS = [{ v: 1, l: 'Seg' }, { v: 2, l: 'Ter' }, { v: 3, l: 'Qua' }, { v: 4, l: 'Qui' }, { v: 5, l: 'Sex' }];
  for (let i = 0; i < count; i++) {
    const wd = wdPerTurma[i] || [1, 3];
    const block = document.createElement('div');
    block.className = 'turma-block';
    block.innerHTML = `
      <div class="turma-block-head">Turma ${i + 1}</div>
      <label class="onb-label" style="margin-bottom:4px">Nome da turma</label>
      <input class="onb-input turma-name" style="margin-bottom:10px" data-idx="${i}" placeholder="Ex: Intermediário" value="${escHtml(names[i] || '')}">
      <label class="onb-label" style="margin-bottom:6px">Dias de aula</label>
      <div class="wd-grid turma-weekdays" data-turma="${i}">
        ${DAYS.map(d => {
      const chk = wd.includes(d.v);
      return `<label class="wd-label${chk ? ' checked' : ''}" data-day="${d.v}"><input type="checkbox" value="${d.v}"${chk ? ' checked' : ''}> ${d.l}</label>`;
    }).join('')}
      </div>`;
    container.appendChild(block);
  }
  container.querySelectorAll('.wd-label input').forEach(cb => {
    cb.addEventListener('change', () => cb.parentElement.classList.toggle('checked', cb.checked));
  });
}

function getPerTurmaWeekdays() {
  return [...document.querySelectorAll('#onb-turmas .turma-weekdays')].map(block =>
    [...block.querySelectorAll('input[type=checkbox]:checked')].map(cb => Number(cb.value))
  );
}

function getSegVal(groupId) {
  return document.querySelector(`#${groupId} .seg-btn.sel`)?.dataset.val || '';
}

function renderWizardStep() {
  document.querySelectorAll('.onb-step').forEach((s, i) => s.classList.toggle('active', i + 1 === onbStep));
  const ind = document.getElementById('step-ind');
  ind.innerHTML = '';
  for (let i = 1; i <= ONB_TOTAL; i++) {
    const d = document.createElement('div');
    d.className = `step-dot${i < onbStep ? ' done' : i === onbStep ? ' curr' : ''}`;
    ind.appendChild(d);
  }
  document.getElementById('onb-back').style.display = onbStep > 1 ? '' : 'none';
  document.getElementById('onb-next').textContent = onbStep === ONB_TOTAL ? 'Salvar' : 'Próximo';
  if (onbStep === 3) {
    const count = Number(getSegVal('onb-turma-count')) || 1;
    if (document.querySelectorAll('#onb-turmas .turma-block').length !== count)
      renderTurmaFields(count, [], getPerTurmaWeekdays());
  }
  if (onbStep === ONB_TOTAL) buildSummary();
}

function buildSummary() {
  const wdPerTurma = getPerTurmaWeekdays();
  const names = [...document.querySelectorAll('.turma-name')].map(i => i.value.trim());
  const DAYNAMES = ['', 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  let html = `<b>Ciclo:</b> ${getSegVal('onb-cycle')}<br><b>Módulos:</b> ${getSegVal('onb-mods')}<br>`;
  html += `<b>Início:</b> ${document.getElementById('onb-start').value || '—'}<br>`;
  const tc = Number(getSegVal('onb-turma-count')) || 1;
  for (let i = 0; i < tc; i++) {
    html += `<b>${escHtml(names[i] || `Turma ${i + 1}`)}:</b> ${(wdPerTurma[i] || []).map(d => DAYNAMES[d]).join(', ') || '—'}<br>`;
  }
  html += `<b>IA auto-editar:</b> ${getSegVal('onb-ai') === 'true' ? 'Sim' : 'Não'}`;
  document.getElementById('onb-summary').innerHTML = html;
}

document.getElementById('onb-next').addEventListener('click', async () => {
  if (onbStep < ONB_TOTAL) { onbStep++; renderWizardStep(); return; }
  const btn = document.getElementById('onb-next');
  btn.disabled = true; btn.textContent = 'Salvando...';
  const onbMsg = document.getElementById('onb-msg');
  onbMsg.className = 'onb-msg'; onbMsg.textContent = '';
  const turmaCount = Number(getSegVal('onb-turma-count')) || 1;
  const wdPerTurma = getPerTurmaWeekdays();
  const turmaNames = [...document.querySelectorAll('.turma-name')].map(i => i.value.trim() || `Turma ${i + 1}`);
  const startDate = document.getElementById('onb-start').value;
  const displayName = document.getElementById('onb-display-name').value.trim();
  const allowAiEdits = getSegVal('onb-ai') === 'true';
  const calendarJson = {};
  wdPerTurma.forEach((wd, idx) => {
    if (!wd.length) return;
    const cal = calcLessonDates(startDate, wd, 33);
    Object.entries(cal).forEach(([k, v]) => { calendarJson[`t${idx}_${k}`] = v; });
  });
  if (displayName) {
    currentUser.user_metadata = currentUser.user_metadata || {};
    currentUser.user_metadata.display_name = displayName;
    sb.auth.updateUser({ data: { display_name: displayName } }).then(() => { }).catch(() => { });
  }
  const err = await savePreferences({
    turmaCount, cycleType: getSegVal('onb-cycle'), moduleCount: Number(getSegVal('onb-mods')),
    startDate, turmas: turmaNames, allowAiEdits, weekdays: wdPerTurma, calendarJson, displayName
  });
  btn.disabled = false; btn.textContent = 'Salvar';
  if (err) { onbMsg.className = 'onb-msg err'; onbMsg.textContent = err; return; }
  userPreferences = {
    user_id: currentUser.id, turma_count: turmaCount, cycle_type: getSegVal('onb-cycle'),
    module_count: Number(getSegVal('onb-mods')), start_date: startDate || null,
    turmas_json: turmaNames, allow_ai_edits: allowAiEdits, weekdays_json: wdPerTurma,
    calendar_json: calendarJson, display_name: displayName || null
  };
  applyCalendarDates();
  document.getElementById('topbar-title').innerHTML =
    `Meu Cronograma <span>${escHtml(displayName || currentUser?.email || '')}</span>`;
  renderSchedule(); updatePills(); updateProfileView(); closeAllModals();
  showToast('✓ Configurações salvas!', 'ok');
  await loadUserCards();
});

document.getElementById('onb-back').addEventListener('click', () => { if (onbStep > 1) { onbStep--; renderWizardStep(); } });
document.getElementById('onb-turma-count').addEventListener('click', e => {
  const btn = e.target.closest('.seg-btn');
  if (btn) renderTurmaFields(Number(btn.dataset.val), [], getPerTurmaWeekdays());
});

// Ciclo legacy → forçar 3 turmas automaticamente; mod12 → liberar escolha
document.getElementById('onb-cycle').addEventListener('click', e => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  const isLegacy = btn.dataset.val === 'legacy';
  // Atualiza visibilidade do btn "3 turmas" e força seleção
  const turmaBtns = document.querySelectorAll('#onb-turma-count .seg-btn');
  if (isLegacy) {
    // Legacy = básico + intermediário + avançado → força 3
    turmaBtns.forEach(b => b.classList.toggle('sel', b.dataset.val === '3'));
    renderTurmaFields(3, [], getPerTurmaWeekdays());
    // Sugere nomes padrão se ainda não foram preenchidos
    setTimeout(() => {
      const names = [...document.querySelectorAll('.turma-name')];
      if (names[0] && !names[0].value) names[0].value = 'Básico';
      if (names[1] && !names[1].value) names[1].value = 'Intermediário';
      if (names[2] && !names[2].value) names[2].value = 'Avançado';
    }, 50);
  } else {
    // mod12: garante que a seleção atual está válida (1 ou 2)
    const curVal = getSegVal('onb-turma-count');
    if (curVal === '3') {
      turmaBtns.forEach(b => b.classList.toggle('sel', b.dataset.val === '2'));
      renderTurmaFields(2, [], getPerTurmaWeekdays());
    }
  }
});
document.querySelectorAll('.seg-btns').forEach(group => {
  group.addEventListener('click', e => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    group.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
  });
});

// ── PROFILE ──
function updateProfileView() {
  document.getElementById('prof-email').textContent = currentUser?.email || '—';
  document.getElementById('prof-name').textContent = userPreferences?.display_name || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || '—';
  document.getElementById('prof-turmas').textContent = (userPreferences?.turmas_json || []).join(', ') || 'Não configurado';
  document.getElementById('prof-start').textContent = userPreferences?.start_date || 'Não configurado';
}

document.getElementById('prof-wizard').addEventListener('click', openWizard);
document.getElementById('prof-logout').addEventListener('click', async () => {
  const btn = document.getElementById('prof-logout');
  btn.disabled = true; btn.textContent = 'Saindo...';
  try { await sb.auth.signOut(); } catch (e) { console.warn('signOut:', e); }
  currentUser = null; userPreferences = null;
  Object.keys(userCards).forEach(k => delete userCards[k]);
  btn.disabled = false; btn.textContent = 'Sair';
  showLanding();
});

document.getElementById('prof-name-save').addEventListener('click', async () => {
  const val = document.getElementById('prof-name-input').value.trim();
  if (!val) { showToast('Digite um nome', 'err'); return; }
  const btn = document.getElementById('prof-name-save');
  btn.disabled = true; btn.textContent = 'Salvando...';
  try {
    const { error } = await sb.from('user_preferences').update({ display_name: val, updated_at: new Date().toISOString() }).eq('user_id', currentUser.id);
    if (error) throw new Error(error.message);
    if (userPreferences) userPreferences.display_name = val;
    currentUser.user_metadata = { ...(currentUser.user_metadata || {}), display_name: val };
    updateProfileView();
    document.getElementById('topbar-title').innerHTML = `Meu Cronograma <span>${escHtml(val)}</span>`;
    document.getElementById('prof-name-input').value = '';
    showToast('✓ Nome atualizado', 'ok');
  } catch (e) { showToast(e.message, 'err'); }
  btn.disabled = false; btn.textContent = 'Salvar';
});

// ── AUTH — sem timeout artificial ──
let authBusy = false;
document.getElementById('land-login-btn').addEventListener('click', () => openAuthModal('login'));
document.getElementById('land-register-btn').addEventListener('click', () => openAuthModal('register'));
document.getElementById('land-cta-btn').addEventListener('click', () => openAuthModal('register'));
document.getElementById('land-cta-login').addEventListener('click', () => openAuthModal('login'));
document.getElementById('auth-modal-close').addEventListener('click', () => document.getElementById('auth-modal').classList.remove('open'));
document.getElementById('auth-modal').addEventListener('click', e => { if (e.target === document.getElementById('auth-modal')) document.getElementById('auth-modal').classList.remove('open'); });
document.getElementById('auth-toggle').addEventListener('click', () => openAuthModal(authMode === 'login' ? 'register' : 'login'));

document.getElementById('auth-submit').addEventListener('click', async () => {
  if (authBusy) return;
  authBusy = true;
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  const name = document.getElementById('auth-name')?.value.trim() || '';
  const msgEl = document.getElementById('auth-msg');
  msgEl.className = 'auth-msg'; msgEl.textContent = '';
  if (!email || !pass) { msgEl.className = 'auth-msg err'; msgEl.textContent = 'Preencha e-mail e senha.'; authBusy = false; return; }
  try {
    if (authMode === 'login') {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      await applySession(data.user);
    } else {
      const { data, error } = await sb.auth.signUp({
        email, password: pass, options: {
          data: { display_name: name || email.split('@')[0] },
          emailRedirectTo: 'https://cronograma-fiec.vercel.app/v2/'
        }
      });
      if (error) throw error;
      if (data.user && !data.session) {
        msgEl.className = 'auth-msg ok';
        msgEl.textContent = 'Conta criada! Confirme seu e-mail e depois faça login.';
      } else if (data.user) {
        await applySession(data.user);
      }
    }
  } catch (e) { msgEl.className = 'auth-msg err'; msgEl.textContent = e.message; }
  authBusy = false;
});

document.getElementById('auth-email').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('auth-pass').focus(); });
document.getElementById('auth-pass').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('auth-submit').click(); });

document.getElementById('auth-google').addEventListener('click', async () => {
  const btn = document.getElementById('auth-google');
  btn.disabled = true;
  await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://cronograma-fiec.vercel.app/v2/' } });
  btn.disabled = false;
});

// ── EXCEL IMPORT ──
document.getElementById('import-excel-btn').addEventListener('click', () => document.getElementById('excel-input').click());
document.getElementById('excel-input').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file || !currentUser) return;
  if (typeof XLSX === 'undefined') { showToast('SheetJS não carregou', 'err'); return; }
  const btn = document.getElementById('import-excel-btn');
  btn.disabled = true; btn.textContent = '⏳ Importando...';
  try {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab);
    const rows = [];
    const prefixMap = ['i', 'a', 'c', 'd'];
    wb.SheetNames.forEach((sheetName, si) => {
      const prefix = prefixMap[si] || 'i';
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!json.length) return;
      const hdrs = Object.keys(json[0]).map(h => ({ k: h, l: h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') }));
      const col = (...terms) => hdrs.find(h => terms.some(t => h.l.includes(t)))?.k;
      const numCol = col('aula', 'num', '#', 'n.', 'lesson');
      const titleCol = col('titulo', 'title', 'nome', 'assunto', 'tema');
      const descCol = col('conteudo', 'topico', 'descri', 'topic', 'content');
      const linkCol = col('link', 'url', 'atividade');
      json.forEach((row, i) => {
        const rawNum = numCol ? String(row[numCol]).trim() : '';
        const isEnc = /enc/i.test(rawNum) || /encerramento/i.test(titleCol ? String(row[titleCol]) : '');
        const num = isEnc ? 'enc' : parseInt(rawNum) || i + 1;
        const cardId = isEnc ? 'enc' : `${prefix}${num}`;
        const title = titleCol ? String(row[titleCol]).trim() : cardId;
        if (!title) return;
        rows.push({ user_id: currentUser.id, card_id: cardId, title, description: descCol ? String(row[descCol]).trim() : '', activity_link: linkCol ? String(row[linkCol]).trim() : '', lesson_date: null, tags: null, updated_at: new Date().toISOString() });
      });
    });
    if (!rows.length) { showToast('Nenhuma linha encontrada', 'err'); return; }
    const { error } = await sb.from('user_card_content').upsert(rows, { onConflict: 'user_id,card_id' });
    if (error) throw new Error(error.message);
    rows.forEach(r => { userCards[r.card_id] = { title: r.title, description: r.description, activityLink: r.activity_link || '', lessonDate: '', tags: '' }; });
    renderSchedule();
    showToast(`✓ ${rows.length} aula(s) importadas`, 'ok');
  } catch (err) { showToast('Erro: ' + err.message, 'err'); }
  finally { btn.disabled = false; btn.textContent = '📥 Importar Excel'; }
});

// ── GALLERY ──
async function loadPublicSchedules() {
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '<div class="empty-state"><p>Carregando...</p></div>';
  try {
    const { data, error } = await sb.rpc('get_public_schedules');
    if (error || !data?.length) { grid.innerHTML = '<div class="empty-state"><p>Nenhum cronograma público ainda.</p></div>'; return; }
    grid.innerHTML = data.map(p => {
      const turmas = p.turmas_json || [];
      const nm = p.display_name || 'Professor(a)';
      return `<div class="gal-card" onclick="openPublicSchedule('${p.user_id}')">
        <div class="gal-name">${escHtml(nm)}</div>
        <div class="gal-meta">${p.turma_count || 1} turma(s) · ${p.start_date || 'sem data'}</div>
        ${turmas.length ? `<div class="gal-turmas">${turmas.map(t => `<span class="gal-turma-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
      </div>`;
    }).join('');
  } catch (e) { grid.innerHTML = `<div class="empty-state"><p>Erro: ${escHtml(e.message)}</p></div>`; }
}

async function openPublicSchedule(userId) {
  const overlay = document.getElementById('pub-sched-overlay');
  overlay.classList.add('open');
  document.getElementById('pub-sched-title').textContent = 'Carregando...';
  document.getElementById('pub-cards-i').innerHTML = '<div style="padding:20px;color:var(--text-muted);font-size:13px">Carregando...</div>';
  document.getElementById('pub-cards-a').innerHTML = '';
  try {
    const [{ data: prefs }, { data: cards, error }] = await Promise.all([
      sb.from('user_preferences').select('turmas_json,display_name,calendar_json,start_date,turma_count,weekdays_json').eq('user_id', userId).maybeSingle(),
      sb.from('user_card_content').select('card_id,title,description,activity_link,lesson_date,tags').eq('user_id', userId).order('lesson_date', { ascending: true, nullsFirst: false })
    ]);
    if (error) throw new Error(error.message);
    const turmas = prefs?.turmas_json || ['Turma 1'];
    const pubTurmaCount = prefs?.turma_count || turmas.length || 1;
    const pubStartDate = prefs?.start_date || '';
    const pubStartLabel = pubStartDate ? ` · ${formatDateBR(pubStartDate).day}/${formatDateBR(pubStartDate).mo}` : '';
    document.getElementById('pub-sched-title').textContent = `${prefs?.display_name || 'Professor(a)'} — Cronograma`;
    document.getElementById('pub-col-i-name').textContent = (turmas[0] || 'Turma 1') + pubStartLabel;
    document.getElementById('pub-col-a-name').textContent = (turmas[1] || 'Turma 2') + pubStartLabel;
    document.getElementById('pub-col-b-name').textContent = (turmas[2] || 'Turma 3') + pubStartLabel;
    document.getElementById('pub-col-a').style.display = pubTurmaCount >= 2 ? '' : 'none';
    document.getElementById('pub-col-b').style.display = pubTurmaCount >= 3 ? '' : 'none';
    document.getElementById('pub-sched-grid').classList.toggle('cols-3', pubTurmaCount >= 3);
    document.getElementById('pub-sched-grid').style.gridTemplateColumns = pubTurmaCount === 1 ? '1fr' : pubTurmaCount >= 3 ? '' : '1fr 1fr';
    // Se calendar_json vier vazio mas tiver start_date + weekdays_json, recalcula
    let calJson = prefs?.calendar_json || {};
    if (!Object.keys(calJson).length && prefs?.start_date && prefs?.weekdays_json) {
      let wdList = prefs.weekdays_json;
      if (!Array.isArray(wdList[0])) wdList = [wdList, wdList];
      wdList.forEach((wd, idx) => {
        if (!wd?.length) return;
        const dates = calcLessonDates(prefs.start_date, wd, 33);
        Object.entries(dates).forEach(([k, v]) => { calJson[`t${idx}_${k}`] = v; });
      });
    }
    const cardMap = {};
    (cards || []).forEach(r => { cardMap[r.card_id] = { title: r.title, description: r.description, lessonDate: r.lesson_date || '', tags: r.tags || '', activityLink: r.activity_link || '' }; });
    const pubPrefixes = turmas.length >= 3 ? ['i', 'a', 'b'] : ['i', 'a'];
    pubPrefixes.forEach((prefix, colIdx) => {
      const container = document.getElementById(`pub-cards-${prefix}`);
      container.innerHTML = '';
      let shown = 0;
      const ids = [...Array.from({ length: 20 }, (_, i) => `${prefix}${i + 1}`)];
      if (['a', 'b'].includes(prefix)) ids.push('enc');
      ids.forEach(id => {
        const card = cardMap[id];
        if (!card) return;
        const n = id.match(/\d+/)?.[0] || '';
        const dateStr = card.lessonDate || (calJson[`t${colIdx}_lesson_${n}`] || calJson[`lesson_${n}`] || '');
        const lc = document.createElement('div');
        lc.className = 'lc' + (id === 'enc' ? ' enc-card' : '');
        let dateHtml = '';
        if (dateStr) { const { day, mo, wd } = formatDateBR(dateStr); dateHtml = `<div class="lc-day">${day}</div><div class="lc-month">${mo}</div><div class="lc-wd">${wd}</div>`; }
        else { dateHtml = `<div class="lc-no-date">#${n}</div>`; }
        lc.innerHTML = `<div class="lc-date">${dateHtml}</div><div class="lc-body"><div class="lc-title">${escHtml(card.title)}</div>${card.description ? `<div class="lc-desc">${escHtml(card.description.split('\n')[0])}</div>` : ''}</div><div class="lc-right"><span class="lc-num">#${n}</span>${card.tags ? `<div class="tag-dot ${card.tags}"></div>` : ''}</div>`;
        lc.style.cursor = 'pointer';
        lc.addEventListener('click', () => openPubCardDetail(card, dateStr));
        container.appendChild(lc); shown++;
      });
      document.getElementById(`pub-col-${prefix}-count`).textContent = `${shown} aula${shown !== 1 ? 's' : ''}`;
      if (!shown) container.innerHTML = '<div style="padding:20px;color:var(--text-muted);font-size:13px">Nenhuma aula cadastrada.</div>';
    });
  } catch (e) {
    document.getElementById('pub-sched-title').textContent = 'Erro ao carregar';
    document.getElementById('pub-cards-i').innerHTML = `<div style="padding:20px;color:var(--red);font-size:13px">${escHtml(e.message)}</div>`;
  }
}

// ── TOGGLE DONE ──
async function toggleDone(id) {
  if (!currentUser || !sb) return;
  const card = userCards[id];
  if (!card) return;
  const newDone = !card.done;
  try {
    const row = {
      user_id: currentUser.id, card_id: id,
      title: card.title || id, description: card.description || '',
      activity_link: card.activityLink || null, lesson_date: card.lessonDate || null,
      tags: card.tags || null, done: newDone, updated_at: new Date().toISOString()
    };
    await upsertCard(row);
    userCards[id].done = newDone;
    closeAllModals();
    renderSchedule();
    showToast(newDone ? '✓ Aula marcada como concluída' : 'Conclusão desfeita', newDone ? 'ok' : '');
  } catch (e) { showToast('Erro: ' + e.message, 'err'); }
}

// ── DELETE CARD ──
async function deleteCard(id) {
  if (!currentUser || !sb) return;
  const card = userCards[id];
  if (!card) return;
  if (!confirm(`Excluir a aula "${card.title}"? Esta ação não pode ser desfeita.`)) return;
  try {
    const { error } = await sb.from('user_card_content')
      .delete().eq('user_id', currentUser.id).eq('card_id', id);
    if (error) throw new Error(error.message);
    delete userCards[id];
    closeAllModals();
    renderSchedule();
    showToast('Aula excluída', '');
  } catch (e) { showToast('Erro: ' + e.message, 'err'); }
}

// Modal de detalhe do card público (somente leitura)
function openPubCardDetail(card, dateStr) {
  // Reusa o detail-modal existente mas sem botão editar
  const body = document.getElementById('detail-body');
  const title = card.title || '';
  const desc = card.description || '';
  const tag = card.tags || '';
  const link = card.activityLink || '';
  const topics = desc ? desc.split('\n').filter(Boolean) : [];
  let h = '';
  if (dateStr) h += `<div class="detail-date">${dateStr}</div>`;
  h += `<div class="detail-title">${escHtml(title)}</div>`;
  if (tag) h += `<div class="detail-tag ${tag}">${tag.charAt(0).toUpperCase() + tag.slice(1)}</div>`;
  if (topics.length) {
    h += `<div class="detail-section"><div class="detail-section-label">Conteúdo</div>`;
    topics.forEach(t => h += `<div class="detail-topic"><div class="detail-bullet"></div><span>${escHtml(t)}</span></div>`);
    h += `</div>`;
  }
  if (link) {
    h += `<div class="detail-section"><div class="detail-section-label">Atividade</div>`;
    h += `<a class="detail-link" href="${escHtml(link)}" target="_blank" rel="noopener">🔗 Abrir atividade</a>`;
    h += `<iframe src="${toGoogleEmbedUrl(link)}" class="detail-iframe" allow="autoplay"></iframe>`;
    h += `</div>`;
  }
  body.className = 'modal-body';
  body.innerHTML = h;
  // Esconde botões de ação no modal público
  document.getElementById('detail-edit').style.display = 'none';
  document.getElementById('detail-done').style.display = 'none';
  document.getElementById('detail-delete').style.display = 'none';
  document.getElementById('detail-modal').dataset.col = '';
  openModal('detail-modal');
}

document.getElementById('gallery-refresh').addEventListener('click', loadPublicSchedules);
document.getElementById('cycle-btn-1').addEventListener('click', () => { if (currentCycle === 1) return; currentCycle = 1; renderSchedule(); });
document.getElementById('cycle-btn-2').addEventListener('click', () => { if (currentCycle === 2) return; currentCycle = 2; renderSchedule(); });
document.getElementById('pub-sched-close').addEventListener('click', () => document.getElementById('pub-sched-overlay').classList.remove('open'));

// ── AI SUGGESTIONS ──
async function loadAiSuggestions() {
  if (!currentUser || !sb) return;
  try {
    const { data } = await sb.from('ai_suggestions').select('id,card_id,field,current_value,suggested_value,reason,status,created_at').eq('user_id', currentUser.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(50);
    suggestionsPending = data || [];
    updateSuggBadge();
  } catch { }
}

function updateSuggBadge() {
  const b = document.getElementById('sugg-badge');
  b.textContent = suggestionsPending.length;
  b.style.display = suggestionsPending.length > 0 ? '' : 'none';
}

function renderAiSuggestions() {
  const list = document.getElementById('sugg-list');
  if (!suggestionsPending.length) { list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">Nenhuma sugestão pendente.</div>'; return; }
  list.innerHTML = suggestionsPending.map(s => `
    <div class="sugg-item" id="si-${s.id}">
      <div class="sugg-top">
        <span class="sugg-card-id">${s.card_id}</span>
        <span class="sugg-field">${s.field}</span>
        ${s.reason ? `<span class="sugg-reason">— ${escHtml(s.reason)}</span>` : ''}
      </div>
      <div class="sugg-new">${escHtml(s.suggested_value)}</div>
      <div class="sugg-actions">
        <button class="sugg-approve" onclick="handleSugg('${s.id}','approve')">✓ Aprovar</button>
        <button class="sugg-reject"  onclick="handleSugg('${s.id}','reject')">✕ Rejeitar</button>
      </div>
    </div>`).join('');
}

async function handleSugg(id, action) {
  if (!currentUser || !sb) return;
  const item = document.getElementById(`si-${id}`);
  if (item) item.style.opacity = '.5';
  try {
    if (action === 'approve') {
      const s = suggestionsPending.find(x => x.id === id);
      if (s) {
        const ex = userCards[s.card_id] || {};
        const row = {
          user_id: currentUser.id, card_id: s.card_id,
          title: s.field === 'title' ? s.suggested_value : (ex.title || s.card_id),
          description: s.field === 'description' ? s.suggested_value : (ex.description || ''),
          activity_link: s.field === 'activity_link' ? s.suggested_value : (ex.activityLink || null),
          tags: s.field === 'tags' ? s.suggested_value : (ex.tags || null),
          updated_at: new Date().toISOString()
        };
        await upsertCard(row);
        userCards[s.card_id] = { title: row.title, description: row.description, activityLink: row.activity_link || '', lessonDate: ex.lessonDate || '', tags: row.tags || '' };
        // Extrai o prefixo da coluna (i, a, b, c, d, e) do card_id
        console.log('[handleSugg] aprovado card_id:', s.card_id, 'field:', s.field, 'valor:', s.suggested_value);
        renderSchedule(); // re-renderiza tudo para garantir que o card aparece
      }
    }
    await sb.from('ai_suggestions').update({ status: action === 'approve' ? 'approved' : 'rejected', updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', currentUser.id);
    suggestionsPending = suggestionsPending.filter(x => x.id !== id);
    renderAiSuggestions(); updateSuggBadge();
    showToast(action === 'approve' ? '✓ Mudança aplicada' : 'Sugestão rejeitada', action === 'approve' ? 'ok' : '');
  } catch (e) { if (item) item.style.opacity = '1'; showToast(e.message, 'err'); }
}

// ── CHAT COM GEMINI DIRETO ──
let chatOpen = false;
function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chat-box').classList.toggle('open', chatOpen);
  if (chatOpen) document.getElementById('chat-input').focus();
}
document.getElementById('chat-close').addEventListener('click', () => { chatOpen = false; document.getElementById('chat-box').classList.remove('open'); });
document.getElementById('chat-fab-top').addEventListener('click', toggleChat);
document.getElementById('chat-send').addEventListener('click', sendChat);
document.getElementById('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });

function addChatMsg(role, text) {
  const log = document.getElementById('chat-log');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`; div.textContent = text;
  log.appendChild(div); log.scrollTop = log.scrollHeight;
}
function addTypingIndicator() {
  const log = document.getElementById('chat-log');
  const div = document.createElement('div');
  div.id = 'chat-typing'; div.className = 'chat-msg ai'; div.textContent = '...'; div.style.opacity = '.5';
  log.appendChild(div); log.scrollTop = log.scrollHeight;
}
function removeTypingIndicator() { document.getElementById('chat-typing')?.remove(); }

async function callGeminiDirect(prompt) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada no app_config.js');
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
  );
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err?.error?.message || `Gemini HTTP ${resp.status}`); }
  const data = await resp.json();
  const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}').trim().replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  try { return JSON.parse(text); } catch { return { answer: text, suggestions: [] }; }
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  if (!GEMINI_API_KEY) { showToast('Configure GEMINI_API_KEY no app_config.js', 'err'); return; }
  input.value = '';
  addChatMsg('user', msg);
  chatHistory.push({ role: 'user', content: msg });
  addTypingIndicator();
  document.getElementById('chat-send').disabled = true;
  try {
    // Monta contexto dos cards existentes
    const cardContext = Object.entries(userCards).slice(0, 20)
      .map(([id, c]) => (`${id}: "${c.title}" — ${c.description || 'sem descrição'}`)).join('\n') || 'Nenhum card criado ainda.';

    // Monta lista de IDs válidos no cronograma para a IA não inventar
    const turmas = userPreferences?.turmas_json || [];
    const turmaCount = userPreferences?.turma_count || 1;
    const prefixes = ['i', 'a', 'b', 'c', 'd', 'e'].slice(0, turmaCount);
    const validIds = [];
    prefixes.forEach(p => { for (let n = 1; n <= 20; n++) validIds.push(`${p}${n}`); });
    validIds.push('enc');
    const validIdsStr = validIds.slice(0, turmaCount * 20 + 1).join(', ');

    // Nomes das turmas para a IA saber qual prefixo pertence a qual turma
    const turmaMap = prefixes.map((p, i) => `${p}1..${p}20 = ${turmas[i] || 'Turma ' + (i + 1)}`).join(' | ');

    const historyText = chatHistory.slice(-6).map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`).join('\n');
    const prompt = `Você é um assistente de cronograma de aulas do FIEC.

IDs VÁLIDOS (use APENAS estes): ${validIdsStr}
Mapeamento de turmas: ${turmaMap}

Cards já criados:
${cardContext}

Histórico recente:
${historyText}

REGRAS OBRIGATÓRIAS:
- Responda SOMENTE em JSON válido, sem markdown, sem texto fora do JSON
- card_id DEVE ser um dos IDs válidos listados acima — NUNCA invente IDs
- field deve ser exatamente: title, description, activity_link ou tags
- Se o usuário pedir para mudar o nome/título de uma aula específica (ex: "i3"), use esse card_id exato
- Se o card ainda não existe, use o próximo ID disponível da turma correta

Formato de resposta:
{"answer":"resposta em português amigável","suggestions":[{"card_id":"id exato da lista válida","field":"title","suggested_value":"novo valor","reason":"motivo breve"}]}

Mensagem: ${msg}`;

    const data = await callGeminiDirect(prompt);
    removeTypingIndicator();
    const answer = data.answer || 'Sem resposta.';
    addChatMsg('ai', answer);
    chatHistory.push({ role: 'assistant', content: answer });

    // Persiste no banco (fire-and-forget)
    if (sb && currentUser) {
      sb.from('chat_messages').insert([{ user_id: currentUser.id, role: 'user', content: msg }, { user_id: currentUser.id, role: 'assistant', content: answer }]).then(() => { }).catch(() => { });
    }

    if (data.suggestions?.length) {
      console.log('[IA] sugestões recebidas:', JSON.stringify(data.suggestions));
      if (userPreferences?.allow_ai_edits) {
        // Modo auto: aplica direto
        await Promise.all(data.suggestions.map(async s => {
          try {
            const ex = userCards[s.card_id] || {};
            const row = {
              user_id: currentUser.id, card_id: s.card_id,
              title: s.field === 'title' ? s.suggested_value : (ex.title || s.card_id),
              description: s.field === 'description' ? s.suggested_value : (ex.description || ''),
              activity_link: s.field === 'activity_link' ? s.suggested_value : (ex.activityLink || null),
              tags: s.field === 'tags' ? s.suggested_value : (ex.tags || null), updated_at: new Date().toISOString()
            };
            await upsertCard(row);
            userCards[s.card_id] = { title: row.title, description: row.description, activityLink: row.activity_link || '', lessonDate: ex.lessonDate || '', tags: row.tags || '' };
            console.log('[IA auto] card salvo:', s.card_id, '→', row.title);
          } catch (e) { console.error('[IA auto] erro ao salvar', s.card_id, e.message); }
        }));
        renderSchedule();
        showToast(`✓ IA aplicou ${data.suggestions.length} sugestão(ões)`, 'ok');
        // Salva no banco de sugestões como aprovadas (histórico)
        if (sb && currentUser) {
          sb.from('ai_suggestions').insert(data.suggestions.map(s => ({
            user_id: currentUser.id, card_id: s.card_id, field: s.field,
            current_value: null, suggested_value: s.suggested_value,
            reason: s.reason || null, status: 'approved'
          }))).then(() => { }).catch(() => { });
        }
      } else {
        // Modo sugestão: salva no banco com await para pegar IDs reais
        let insertedIds = [];
        if (sb && currentUser) {
          try {
            const { data: inserted } = await sb.from('ai_suggestions')
              .insert(data.suggestions.map(s => ({
                user_id: currentUser.id, card_id: s.card_id, field: s.field,
                current_value: null, suggested_value: s.suggested_value,
                reason: s.reason || null, status: 'pending'
              })))
              .select('id,card_id,field,suggested_value,reason,status');
            if (inserted?.length) {
              // Usa os registros reais do banco (com IDs reais)
              suggestionsPending = [...inserted, ...suggestionsPending];
              console.log('[IA sugestões] inseridas no banco:', inserted.map(x => x.id));
            } else {
              // Fallback: UUID local se insert não retornou dados
              suggestionsPending = [...data.suggestions.map(s => ({ ...s, id: crypto.randomUUID() })), ...suggestionsPending];
            }
          } catch (e) {
            console.error('[IA sugestões] erro ao inserir:', e.message);
            suggestionsPending = [...data.suggestions.map(s => ({ ...s, id: crypto.randomUUID() })), ...suggestionsPending];
          }
        } else {
          suggestionsPending = [...data.suggestions.map(s => ({ ...s, id: crypto.randomUUID() })), ...suggestionsPending];
        }
        updateSuggBadge();
        showToast(`💡 ${data.suggestions.length} sugestão(ões) no painel`, '');
      }
    }
  } catch (e) {
    removeTypingIndicator();
    addChatMsg('ai', 'Erro: ' + e.message);
    chatHistory.push({ role: 'assistant', content: 'Erro: ' + e.message });
  }
  document.getElementById('chat-send').disabled = false;
}

// ── NAVIGATION ──
document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab === 'suggestions') { document.getElementById('sugg-panel').classList.toggle('open'); renderAiSuggestions(); return; }
    switchView(tab);
  });
});
document.getElementById('sugg-close').addEventListener('click', () => document.getElementById('sugg-panel').classList.remove('open'));
document.getElementById('wizard-btn').addEventListener('click', openWizard);
document.getElementById('setup-btn').addEventListener('click', openWizard);

['onb-close', 'detail-close', 'detail-close2', 'edit-close', 'edit-close2'].forEach(id => document.getElementById(id)?.addEventListener('click', closeAllModals));
document.querySelectorAll('.modal-bg').forEach(bg => bg.addEventListener('click', e => { if (e.target === bg) closeAllModals(); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAllModals(); document.getElementById('sugg-panel').classList.remove('open'); } });

// ── ADD CARD — próximo ID disponível ──
function getNextCardId(prefix) {
  for (let n = 1; n <= 20; n++) { const id = `${prefix}${n}`; if (!userCards[id]) return id; }
  return `${prefix}21`;
}
document.getElementById('add-i').addEventListener('click', () => editCard(getNextCardId(currentCycle === 2 ? 'c' : 'i')));
document.getElementById('add-a').addEventListener('click', () => editCard(getNextCardId(currentCycle === 2 ? 'd' : 'a')));
document.getElementById('add-b').addEventListener('click', () => editCard(getNextCardId(currentCycle === 2 ? 'e' : 'b')));

// ── HISTORY ──
// Carrega histórico no chat-box ao entrar no app
async function loadChatFromDB() {
  const log = document.getElementById('chat-log');
  if (!log || !currentUser || !sb) return;
  log.innerHTML = '';
  chatHistory = [];
  try {
    const { data, error } = await sb.from('chat_messages')
      .select('role,content,created_at')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true })
      .limit(100);
    if (error || !data?.length) return;
    data.forEach(msg => {
      const role = msg.role === 'user' ? 'user' : 'ai';
      const div = document.createElement('div');
      div.className = 'chat-msg ' + role;
      div.textContent = msg.content;
      log.appendChild(div);
      chatHistory.push({ role: msg.role, content: msg.content });
    });
    log.scrollTop = log.scrollHeight;
  } catch (e) { console.warn('loadChatFromDB:', e.message); }
}

async function loadChatHistory() {
  const log = document.getElementById('history-log');
  if (!currentUser || !sb) { log.innerHTML = '<div style="color:var(--text-muted);font-size:13px">Faça login para ver o histórico.</div>'; return; }
  log.innerHTML = '<div style="color:var(--text-muted);font-size:13px">Carregando...</div>';
  try {
    const { data, error } = await sb.from('chat_messages').select('role,content,created_at').eq('user_id', currentUser.id).order('created_at', { ascending: true }).limit(100);
    if (error) throw error;
    if (!data?.length) { log.innerHTML = '<div style="color:var(--text-muted);font-size:13px">Nenhuma mensagem ainda.</div>'; return; }
    log.innerHTML = '';
    data.forEach(msg => { const div = document.createElement('div'); div.className = `chat-msg ${msg.role === 'user' ? 'user' : 'ai'}`; div.textContent = msg.content; log.appendChild(div); });
    log.scrollTop = log.scrollHeight;
  } catch (e) { log.innerHTML = `<div style="color:var(--text-muted);font-size:13px">Erro: ${escHtml(e.message)}</div>`; }
}

// ── INIT ──
(async () => { await initSupabase(); })();
