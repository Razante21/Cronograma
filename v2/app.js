// ── CONFIG ──
window.APP_CONFIG = window.APP_CONFIG || {};
const SUPABASE_URL = window.APP_CONFIG.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.APP_CONFIG.SUPABASE_ANON_KEY || '';
const API_BASE = (window.APP_CONFIG.API_BASE || 'http://localhost:8787').replace(/\/+$/, '');
const MAIN_TEMPLATE_EMAIL = 'pcdsantos007@gmail.com';
const GEMINI_MODEL = window.APP_CONFIG.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';

let sb = null, currentUser = null, userPreferences = null;
const userCards = {};
let authMode = 'login';
let selectedTag = '';
let editingCardId = null;
let openDetailId = null;
let chatHistory = [];
let suggestionsPending = [];
let _sessionApplying = false;
let currentCycle = 1;

// ── TEMPLATE DATA ──
const D = {
  'i1': {
    m: 'Aula 1', t: 'Entender o que sabem + Formatação Simples', done: true,
    tp: ['Conversa inicial — entender o nível de cada aluno', 'Negrito, Itálico, Sublinhado', 'Mudar fonte, tamanho e cor do texto', 'Alinhamentos: esquerda, centro, direita e justificado'],
    arq: [{ n: 'Atividade Formatação', u: 'atividade_formatacao_simples.pdf' }]
  },
  'i2': {
    m: 'Aula 2', t: 'Cabeçalho, Rodapé e Numeração', done: true,
    tp: ['Inserir > Cabeçalho — nome do documento', 'Inserir > Rodapé — endereços ou referências', 'Inserir > Número de Página'],
    arq: [{ n: 'Atividade', u: 'atividade_cabecalho_rodape_numeracao.pdf' }]
  },
  'i3': {
    m: 'Aula 3', t: 'Sumário e Índices Automáticos', done: true,
    tp: ['Aplicar estilos Título 1 e Título 2', 'Referências > Sumário > Sumário Automático 1', 'Atualizar sumário após edições'],
    arq: [{ n: 'Atividade', u: 'Atividade_sumario_indices.pdf' }]
  },
  'i4': {
    m: 'Aula 4', t: 'Atividade Geral', done: true,
    tp: ['Prática integrando formatação, cabeçalho, rodapé e sumário', 'Documento completo sobre tema livre'],
    arq: [{ n: 'Atividade', u: 'atividade_geral.pdf' }]
  },
  'i5': {
    m: 'Aula 5', t: 'Aula Final de Word', done: true,
    tp: ['Baixar textosemformato.docx e formatar', 'Exportar em PDF e entregar'],
    arq: [{ n: 'Instrução', u: 'Aula_final_Word.pdf' }, { n: 'Passo a Passo', u: 'Passo_a_passo.pdf' }, { n: 'Exemplo Final', u: 'Exemplo-resultadoFinal.pdf' }]
  },
  'i6': {
    m: 'Aula 6', t: 'Google Docs', done: true,
    tp: ['Criar documento em docs.google.com', 'Compartilhamento: Editor, Comentarista, Leitor', 'Modo Sugestão e Histórico de versões'],
    arq: [{ n: 'Atividade', u: 'atividade_google_docs.pdf' }]
  },
  'i7': {
    m: 'Aula 7', t: 'Introdução ao PowerPoint', done: true,
    tp: ['Criar apresentação em branco ou com template', 'Layouts, inserir texto, imagens e formas', 'Ctrl+M para novo slide'],
    arq: [{ n: 'Atividade', u: 'atividade_comeco_powerpoint.pdf' }]
  },
  'i8': {
    m: 'Aula 8', t: 'PowerPoint — Animações e Recursos Visuais', done: true,
    tp: ['Transições: Aplicar a Todos', 'Animações de Entrada, Ênfase e Saída', 'Painel de Animação para definir a ordem'],
    arq: [{ n: 'Atividade', u: 'atividade_powerpoint_animacoes.pdf' }]
  },
  'i9': {
    m: 'Aula 9', t: 'PowerPoint — Recursos Adicionais', done: true,
    tp: ['SmartArt: Inserir > SmartArt', 'Gráficos: Inserir > Gráfico', 'Inserir áudio e vídeo', 'Designer Inteligente'],
    arq: [{ n: 'Atividade', u: 'atividade_adicionais_powerpoint.pdf' }]
  },
  'i10': {
    m: 'Aula 10', t: 'PowerPoint — Aula Final',
    tp: ['Atividade Pizzaria: 3 slides', 'Slide 1: capa com fundo vermelho', 'Slide 2: cardápio com círculo branco', 'Slide 3: menu de sabores'],
    arq: [{ n: 'Como Fazer', u: 'Como_Fazer_Pizzaria.docx' }, { n: 'Exemplo', u: 'Pizzaria.pptx' }]
  },
  'i11': {
    m: 'Aula 11', t: 'Google Slides',
    tp: ['Acessar slides.google.com', 'Colaboração em tempo real', 'Q&A com público: Apresentar > Ferramentas do público'],
    arq: [{ n: 'Atividade', u: 'INT_Aula15_GoogleSlides_Atividades.html' }]
  },
  'i12': {
    m: 'Aula 12', t: 'Google Meet + Agenda',
    tp: ['Meet: nova reunião, compartilhar tela', 'Agenda: criar evento com link automático', 'Evento recorrente toda semana'],
    arq: [{ n: 'Atividade', u: 'INT_Aula16_MeetAgenda_Atividades.html' }]
  },
  'i13': {
    m: 'Aula 13', t: 'Canva — Introdução',
    tp: ['Criar conta com Google em canva.com', 'Personalizar template e baixar como PNG'],
    arq: [{ n: 'Atividade', u: 'INT_Aula17_CanvaIntro_Atividades.html' }]
  },
  'i14': {
    m: 'Aula 14', t: 'Canva — Intermediário',
    tp: ['Frames, ícones, Regra das 3 Cores', 'Animações e exportação PNG/PDF/MP4'],
    arq: [{ n: 'Atividade', u: 'INT_Aula18_CanvaInter_Atividades.html' }]
  },
  'i15': {
    m: 'Aula 15', t: 'Google Forms',
    tp: ['Tipos de pergunta: múltipla escolha, escala, caixas', 'Lógica condicional entre seções', 'Conectar respostas ao Google Sheets'],
    arq: [{ n: 'Atividade', u: 'INT_Aula19_GoogleForms_Atividades.html' }]
  },
  'i16': {
    m: 'Aula 16', t: 'Introdução à IA — ChatGPT',
    tp: ['Acessar chat.openai.com ou Copilot no Edge', 'Como fazer boas perguntas', 'Escrever e-mail, corrigir texto'],
    arq: [{ n: 'Atividade', u: 'INT_Aula20_IA_Atividades.html' }]
  },
  'i17': {
    m: 'Aula 17', t: 'Google Keep + Agenda',
    tp: ['Keep: nota, lista de tarefas, lembrete', 'Agenda: eventos, visualização semanal'],
    arq: [{ n: 'Atividade', u: 'INT_Aula22_KeepAgenda_Atividades.html' }]
  },
  'i18': {
    m: 'Aula 18', t: 'Revisão Prática',
    tp: ['Word: documento com capa e sumário', 'PowerPoint: apresentação com animações', 'Canva: post com frame e paleta'],
    arq: [{ n: 'Atividade', u: 'INT_Aula23_RevisaoPratica_Atividades.html' }]
  },
  'i19': {
    m: 'Aula 19', t: 'Currículo no Canva',
    tp: ['Pesquisar "Currículo" e escolher template', 'Personalizar: nome, foto, contato', 'Baixar em PDF para Impressão'],
    arq: [{ n: 'Atividade', u: 'INT_Aula24_Curriculo_Atividades.html' }]
  },
  'a1': {
    m: 'Aula 1', t: 'Introdução ao Excel', done: true,
    tp: ['Diagnóstico do nível da turma', 'Interface: células, linhas, colunas', 'Exercícios iniciais'],
    arq: [{ n: 'Atividades Avançado (Drive)', u: 'https://drive.google.com/drive/folders/1vf9iNttdxdevpELlrWU1k1jrULeN8Rcz?usp=sharing', ext: true }]
  },
  'a2': {
    m: 'Aula 2', t: 'Fórmulas Simples', done: true,
    tp: ['Soma, subtração, multiplicação e divisão', 'Preenchimento automático de fórmulas'],
    arq: [{ n: 'Atividade 1', u: 'atvds_aula3.pdf' }, { n: 'Atividade 2', u: 'atvds2_aula3.pdf' }]
  },
  'a3': {
    m: 'Aula 3', t: 'Funções Simples', done: true,
    tp: ['SOMA, MÉDIA, MÍNIMO, MÁXIMO', 'MULT para multiplicação de intervalo'],
    arq: [{ n: 'Atividade', u: 'atividades_excel_aula1.pdf' }]
  },
  'a4': {
    m: 'Aula 4', t: 'Funções Lógicas', done: true,
    tp: ['SE: sintaxe e uso básico', 'E: todas as condições verdadeiras', 'OU: basta uma condição'],
    arq: [{ n: 'Atividade', u: 'atividades_funcoes_logicas_excel.pdf' }, { n: 'Planilha Sinais', u: 'func_log_sinais.xlsx' }]
  },
  'a5': {
    m: 'Aula 5', t: 'Lógica Avançada', done: true,
    tp: ['SE aninhado: SE dentro de SE', 'Combinações de SE+E e SE+OU'],
    arq: [{ n: 'Atividade 1', u: 'atvds_aula4.pdf' }, { n: 'Atividade 2', u: 'atvds_2_aula4.pdf' }]
  },
  'a6': {
    m: 'Aula 6', t: 'Referências', done: true,
    tp: ['Referência relativa: se move ao copiar', 'Referência absoluta $A$1: travada com F4', 'Referência mista'],
    arq: [{ n: 'Atividade', u: 'atvds_fx_ref.txt' }]
  },
  'a7': {
    m: 'Aula 7', t: 'Tabela Dinâmica', done: true,
    tp: ['Criar a partir de dados brutos', 'Áreas: Linhas, Colunas, Valores, Filtros', 'Segmentação de dados'],
    arq: [{ n: 'Planilha de Dados', u: 'ex-atvd_tab_din.xlsx' }, { n: 'Enunciado', u: 'enunc_atvd_tab_din.txt' }]
  },
  'a8': {
    m: 'Aula 8', t: 'Macros', done: true,
    tp: ['Gravar: Exibir > Macros > Gravar Macro', 'Criar botão: Inserir > Formas > Atribuir Macro'],
    arq: [{ n: 'Atividade', u: 'ADV_Aula08_Macros_Atividades.xlsx' }]
  },
  'a9': {
    m: 'Aula 9', t: 'Atividades Complementares', done: true,
    tp: ['Exercícios mistos de SE aninhado', 'Referências absolutas em tabelas maiores', 'Tabela Dinâmica e Macros'],
    arq: [{ n: 'Atividade', u: 'ADV_Aula09_Complementar_Atividades.xlsx' }]
  },
  'a10': {
    m: 'Aula 10', t: 'Complementar + Revisão para Prova',
    tp: ['Exercícios complementares finais', 'SE aninhado: revisitar com exemplos', 'Tabela Dinâmica: montar do zero', 'Simulado: 2-3 questões estilo prova'],
    arq: [{ n: 'Atividade Complementar', u: 'ADV_Aula09_Complementar_Atividades.xlsx' }, { n: 'Lista', u: 'Lista_Exercicios_Excel.xlsx' }]
  },
  'a11': {
    m: 'Aula 11', t: 'Prova — Excel',
    tp: ['Distribuir arquivo de prova', 'Duração: 60 a 80 minutos', 'Conteúdo: SE aninhado, Tabela Dinâmica, Macros'],
    arq: [{ n: 'Prova — Aluno', u: 'Prova_Excel_Modulo3.xlsx' }, { n: 'Gabarito', u: 'Gabarito_Excel_Modulo3.xlsx' }]
  },
  'a12': {
    m: 'Aula 12', t: 'Excel — PROCV',
    tp: ['Analogia da lista telefônica', '4 argumentos: valor, tabela (F4!), coluna, 0', 'Erros comuns antes dos exercícios'],
    arq: [{ n: 'Guia do Professor', u: 'Guia_PROCV_Professor.xlsx' }, { n: 'Lista — Aluno', u: 'Lista_PROCV_Aluno.xlsx' }]
  },
  'a13': {
    m: 'Aula 13', t: 'Excel — ÍNDICE + CORRESP',
    tp: ['Limitação do PROCV: só busca à direita', 'CORRESP: encontra a posição', 'ÍNDICE: busca o valor na posição'],
    arq: [{ n: 'Guia do Professor', u: 'Guia_INDICE_CORRESP.xlsx' }]
  },
  'a14': {
    m: 'Aula 14', t: 'Google Planilhas',
    tp: ['Salvamento automático', 'Cores alternadas: Formatar > Cores alternadas', 'GOOGLEFINANCE para cotação ao vivo'],
    arq: [{ n: 'Atividade', u: 'ADV_Aula20_GSheets_Atividades.xlsx' }]
  },
  'a15': {
    m: 'Aula 15', t: 'Google Sites + Forms',
    tp: ['Sites: criar site arrastando elementos', 'Embutir gráfico do Sheets no site', 'Forms conectado ao Sheets'],
    arq: [{ n: 'Atividade', u: 'ADV_Aula21_SitesFormsSheets_Atividades.xlsx' }]
  },
  'a16': {
    m: 'Aula 16', t: 'IA Dia 1 — Criar',
    tp: ['ChatGPT: pedir fórmula de Excel', 'Gamma App: gerar apresentação inteira', 'SunoAI: gerar música com letra']
  },
  'a17': {
    m: 'Aula 17', t: 'IA Dia 2 — Pesquisar',
    tp: ['NotebookLM: carregar apostila e fazer perguntas', 'Perplexity: pesquisa com fontes citadas', 'Napkin.ai: texto vira infográfico']
  },
  'a18': {
    m: 'Aula 18', t: 'Excel no Dia a Dia',
    tp: ['Planilha de gastos pessoais do zero', 'SOMA entradas, saídas, SALDO', 'Gráfico de pizza por categoria']
  },
  'a19': {
    m: 'Aula 19', t: 'Revisão Excel',
    tp: ['Dúvidas de PROCV, ÍNDICE+CORRESP, SE e Tabela Dinâmica', 'Resolver dúvidas individualmente']
  },
  'enc': {
    m: 'Aula 20', t: 'Encerramento 🍕', enc: true,
    tp: ['Sem matéria hoje!', 'Dia de comemorar o fim do módulo', 'Aproveitem 🎉']
  },
};

// ── HELPERS ──
function escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

let _toastTimer;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = `toast show${type ? ' ' + type : ''}`;
  clearTimeout(_toastTimer); _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

function closeAllModals() {
  document.getElementById('detail-modal').classList.remove('open');
  document.getElementById('edit-modal').classList.remove('open');
  document.getElementById('onb-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ── DATE HELPERS ──
// 2026-03-02 (Seg Carnaval) removido: FIEC teve aula nesse dia (ver cronograma_turmas.html)
const FERIADOS_2026 = new Set(['2026-01-01', '2026-03-03', '2026-04-03', '2026-04-05', '2026-04-20', '2026-04-21', '2026-05-01', '2026-06-11', '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15', '2026-12-25']);

function calcLessonDates(startDate, weekdays, count = 33) {
  if (!startDate || !weekdays || !weekdays.length) return {};
  const result = {}, wdSet = new Set(weekdays.map(Number));
  let cur = new Date(startDate + 'T00:00:00'), lesson = 1, max = 500;
  while (lesson <= count && max-- > 0) {
    const iso = cur.toISOString().slice(0, 10);
    if (wdSet.has(cur.getDay()) && !FERIADOS_2026.has(iso)) { result[`lesson_${lesson}`] = iso; lesson++; }
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

function getCalendarDate(cardId) {
  if (!userPreferences?.calendar_json) return '';
  const cal = userPreferences.calendar_json;
  // Encerramento: última data do calendário (lesson_20 da turma 0)
  if (cardId === 'enc') return cal['t0_lesson_20'] || cal['lesson_20'] || '';
  const m = cardId.match(/^([iabcde])(\d+)$/);
  if (!m) return '';
  // i,c → turma 0; a,d → turma 1; b,e → turma 2
  const idx = (['i', 'c'].includes(m[1])) ? 0 : (['a', 'd'].includes(m[1])) ? 1 : 2, num = m[2];
  const key = `t${idx}_lesson_${num}`;
  return cal[key] || cal[`lesson_${num}`] || '';
}

function formatDateBR(iso) {
  if (!iso) return '';
  const [y, mo, d] = iso.split('-');
  const dt = new Date(iso + 'T00:00:00');
  if (isNaN(dt.getTime())) return `${d}/${mo}`;
  const wd = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dt.getDay()];
  return { day: d, mo: ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][+mo], wd };
}

// ── SUPABASE ──
async function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { console.warn('APP_CONFIG missing'); return; }
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) await applySession(session.user);
  else showLanding();
  sb.auth.onAuthStateChange(async (_, session) => {
    if (_sessionApplying) return;
    if (session?.user) await applySession(session.user);
    else showLanding();
  });
}

async function applySession(user) {
  if (_sessionApplying) return;
  _sessionApplying = true;
  currentUser = user;
  // Clear stale card data from previous session
  Object.keys(userCards).forEach(k => delete userCards[k]);
  showApp();
  try {
    const isOwner = currentUser.email === MAIN_TEMPLATE_EMAIL;
    await ensurePreferences();
    try { await loadUserCards(!isOwner); } catch (e) { console.warn('loadUserCards error:', e); renderSchedule(isOwner); }
    await loadAiSuggestions();
    updateProfileView();
  } catch (e) {
    console.error('applySession error:', e);
  } finally {
    _sessionApplying = false;
  }
}

// ── UI SWITCHING ──
function showLanding() {
  document.getElementById('landing').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('chat-fab-top').style.display = 'none';
  document.getElementById('main-sidebar').style.display = 'none';
  document.body.classList.remove('logged-in');
  document.getElementById('auth-modal').classList.remove('open');
  document.getElementById('auth-msg').className = 'auth-msg';
  document.getElementById('auth-msg').textContent = '';
}

function showApp() {
  document.getElementById('landing').style.display = 'none';
  document.getElementById('auth-modal').classList.remove('open');
  document.getElementById('app').style.display = 'flex';
  document.getElementById('chat-fab-top').style.display = '';
  document.getElementById('main-sidebar').style.display = 'flex';
  document.body.classList.add('logged-in');
  const u = currentUser?.email?.[0]?.toUpperCase() || '?';
  document.querySelectorAll('.sidebar-user').forEach(el => el.textContent = u);
  const email = currentUser?.email || '';
  document.getElementById('topbar-title').innerHTML = `Meu Cronograma <span>${escHtml(currentUser?.user_metadata?.display_name || email)}</span>`;
}

function openAuthModal(mode = 'login') {
  authMode = mode;
  document.getElementById('auth-title').textContent = mode === 'login' ? 'Entrar' : 'Criar conta';
  document.getElementById('auth-submit').textContent = mode === 'login' ? 'Entrar' : 'Criar conta';
  document.getElementById('auth-name-group').style.display = mode === 'register' ? '' : 'none';
  document.getElementById('auth-toggle').textContent = mode === 'login' ? 'Criar conta' : 'Já tenho conta';
  document.getElementById('auth-msg').className = 'auth-msg';
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-pass').value = '';
  document.getElementById('auth-modal').classList.add('open');
  setTimeout(() => document.getElementById('auth-email').focus(), 100);
}

function switchView(tab) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const v = document.getElementById(`view-${tab}`);
  if (v) v.classList.add('active');
  const nb = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
  if (nb) nb.classList.add('active');
  if (tab === 'gallery') loadPublicSchedules();
  if (tab === 'profile') updateProfileView();
  if (tab === 'history') loadChatHistory();
  if (tab === 'schedule') switchView_postSchedule();
  if (tab === 'suggestions') {
    document.getElementById('sugg-panel').classList.add('open');
    renderAiSuggestions();
    return;
  }
  document.getElementById('sugg-panel').classList.remove('open');
}

// ── SCHEDULE RENDER ──
function renderSchedule(isOwner) {
  const prefs = userPreferences;
  const turmas = prefs?.turmas_json || ['Turma 1', 'Turma 2'];
  const cycleBar = document.getElementById('cycle-bar');
  const moduleCount = prefs?.module_count || 1;

  // Cycle tabs — show when module_count >= 2
  if (moduleCount >= 2) {
    cycleBar.classList.add('visible');
    document.getElementById('cycle-btn-1').className = 'cycle-tab c1';
    document.getElementById('cycle-btn-2').className = 'cycle-tab' + (currentCycle === 2 ? ' c2' : '');
    document.getElementById('cycle-label').textContent = `Módulo ${prefs?.module_count || 2}`;
  } else {
    cycleBar.classList.remove('visible');
    currentCycle = 1;
  }

  // Column names depend on cycle
  const prefix1 = currentCycle === 2 ? 'c' : 'i';
  const prefix2 = currentCycle === 2 ? 'd' : 'a';
  const prefix3 = currentCycle === 2 ? 'e' : 'b';
  const turmaCount = turmas.length || 2;
  document.getElementById('col-i-name').textContent = turmas[0] || 'Turma 1';
  document.getElementById('col-a-name').textContent = turmas[1] || 'Turma 2';
  document.getElementById('col-b-name').textContent = turmas[2] || 'Turma 3';
  const colB = document.getElementById('col-b');
  colB.style.display = turmaCount >= 3 ? '' : 'none';
  document.getElementById('main-grid').classList.toggle('cols-3', turmaCount >= 3);
  document.getElementById('wizard-btn').style.display = currentUser ? '' : 'none';
  // Banner só para contas não-principais sem prefs configuradas
  document.getElementById('setup-banner').style.display = (!prefs && currentUser && !isOwner) ? 'flex' : 'none';
  renderCol(prefix1, isOwner);
  renderCol(prefix2, isOwner);
  if (turmaCount >= 3) renderCol(prefix3, isOwner);
  updatePills();
}

function renderCol(col, isOwner) {
  // col can be 'i','a','b' (cycle 1) or 'c','d','e' (cycle 2)
  // HTML containers are always 'cards-i', 'cards-a', 'cards-b'
  const uiCol = (['i', 'c'].includes(col)) ? 'i' : (['a', 'd'].includes(col)) ? 'a' : 'b';
  const container = document.getElementById(`cards-${uiCol}`);
  const addBtn = document.getElementById(`add-${uiCol}`);
  if (!container) return;
  container.innerHTML = '';
  // Collect card IDs
  const ids = [];
  for (let n = 1; n <= 20; n++) ids.push(`${col}${n}`);
  // enc card only for cycle 1 columns
  if (col === 'i' || col === 'a' || col === 'b') ids.push('enc');

  let shown = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let pastSepAdded = false, upcomingAdded = false;

  ids.forEach(id => {
    const tmpl = D[id];
    const card = userCards[id];
    if (!tmpl && !card) return;
    // Regra de privacidade:
    // - Conta principal (isOwner): mostra template D[] como base, sobrescrito por userCards
    // - Outras contas: NUNCA mostra template D[]. Só mostra se o card existir em userCards.
    if (!isOwner && !card) return;

    const dateStr = card?.lessonDate || getCalendarDate(id);
    const dt = dateStr ? new Date(dateStr + 'T00:00:00') : null;
    const isPast = dt && dt < today;
    const isDone = tmpl?.done || false;

    // Separator logic
    if (dateStr) {
      if (isPast && !pastSepAdded) {
        const sep = document.createElement('div');
        sep.className = 'sep'; sep.textContent = 'Passadas';
        container.appendChild(sep);
        pastSepAdded = true;
      } else if (!isPast && pastSepAdded && !upcomingAdded) {
        const sep = document.createElement('div');
        sep.className = 'sep'; sep.textContent = 'Próximas';
        container.appendChild(sep);
        upcomingAdded = true;
      }
    }

    const lc = buildCard(id, uiCol, tmpl, card, dateStr, dt);
    container.appendChild(lc);
    shown++;
  });

  document.getElementById(`col-${uiCol}-count`).textContent = `${shown} aula${shown !== 1 ? 's' : ''}`;
  if (addBtn) addBtn.style.display = currentUser ? '' : 'none';
}

function buildCard(id, col, tmpl, card, dateStr, dt) {
  const lc = document.createElement('div');
  lc.className = `lc${tmpl?.done ? ' done' : ''}${tmpl?.enc ? ' enc-card' : ''}`;
  lc.dataset.id = id;

  let dateHtml = '';
  if (dateStr && dt) {
    const { day, mo, wd } = formatDateBR(dateStr);
    dateHtml = `<div class="lc-day">${day}</div><div class="lc-month">${mo}</div><div class="lc-wd">${wd}</div>`;
  } else {
    dateHtml = `<div class="lc-no-date">${tmpl?.m || id}</div>`;
  }

  const title = card?.title || tmpl?.t || id;
  const desc = card?.description || (tmpl?.tp ? tmpl.tp[0] : '') || '';
  const tag = card?.tags || '';
  const num = id.match(/\d+/)?.[0] || '';

  lc.innerHTML = `
    <div class="lc-date">${dateHtml}</div>
    <div class="lc-body">
      <div class="lc-title">${escHtml(title)}</div>
      ${desc ? `<div class="lc-desc">${escHtml(desc)}</div>` : ''}
    </div>
    <div class="lc-right">
      <span class="lc-num">#${num}</span>
      ${tag ? `<div class="tag-dot ${tag}"></div>` : ''}
    </div>`;

  lc.addEventListener('click', () => openDetail(id, col));
  lc.setAttribute('onclick', `openDetail('${id}','${col}')`);
  return lc;
}

function updatePills() {
  const row = document.getElementById('pill-row');
  if (!userPreferences) { row.innerHTML = ''; return; }
  const turmas = userPreferences.turmas_json || ['Turma 1', 'Turma 2'];
  const iCount = document.getElementById('col-i-count')?.textContent || '';
  const aCount = document.getElementById('col-a-count')?.textContent || '';
  const bCount = document.getElementById('col-b-count')?.textContent || '';
  let html = `
    <div class="pill pill-i">${escHtml(turmas[0] || 'Turma 1')} · ${iCount}</div>
    <div class="pill pill-a">${escHtml(turmas[1] || 'Turma 2')} · ${aCount}</div>`;
  if (turmas.length >= 3) html += `<div class="pill pill-b">${escHtml(turmas[2] || 'Turma 3')} · ${bCount}</div>`;
  row.innerHTML = html;
}

// ── DETAIL MODAL ──
function openDetail(id, col) {
  openDetailId = id;
  const uiCol = (['i', 'c'].includes(col)) ? 'i' : 'a';
  const tmpl = D[id];
  const card = userCards[id];
  const colLabel = uiCol === 'i' ?
    (userPreferences?.turmas_json?.[0] || 'Turma 1') :
    (userPreferences?.turmas_json?.[1] || 'Turma 2');

  document.getElementById('detail-col-label').textContent = colLabel;

  const dateStr = card?.lessonDate || getCalendarDate(id);
  const title = card?.title || tmpl?.t || id;
  const tag = card?.tags || '';
  const isCustom = id in userCards;
  const topics = isCustom ? (card?.description ? [card.description] : []) : (tmpl?.tp || []);
  const arqs = isCustom ? [] : (tmpl?.arq || []);
  const obs = tmpl?.obs || '';
  const actLink = card?.activityLink || '';

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
    h += `<a class="detail-link" href="${escHtml(actLink)}" target="_blank" rel="noopener"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Abrir atividade</a>`;
    const emb = toGoogleEmbedUrl(actLink);
    h += `<iframe src="${emb}" class="detail-iframe" allow="autoplay"></iframe></div>`;
  } else if (arqs.length) {
    h += `<div class="detail-section"><div class="detail-section-label">Arquivos da aula</div>`;
    arqs.forEach(f => {
      const url = f.ext ? f.u : `${API_BASE}/files/${encodeURIComponent(f.u)}`;
      h += `<a class="detail-link" href="${url}" target="_blank" rel="noopener"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>${escHtml(f.n || f.u)}</a>`;
    });
    h += `</div>`;
  }

  if (obs) h += `<div class="detail-obs">📌 ${escHtml(obs)}</div>`;

  const body = document.getElementById('detail-body');
  // Apply column color to bullets (normalize c→i, d→a)
  body.className = `modal-body ${uiCol}`;
  body.innerHTML = h;
  document.getElementById('detail-modal').dataset.col = col;
  document.getElementById('detail-edit').onclick = () => { closeAllModals(); editCard(id); };
  openModal('detail-modal');
}
window.openDetail = openDetail;

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
  const isOwner = currentUser?.email === MAIN_TEMPLATE_EMAIL;
  const tmpl = (isOwner && D[id]) || {};
  document.getElementById('edit-title').value = card.title || tmpl.t || '';
  document.getElementById('edit-desc').value = card.description || (tmpl.tp || []).join('\n') || '';
  document.getElementById('edit-link').value = card.activityLink || '';
  document.getElementById('edit-date').value = card.lessonDate || getCalendarDate(id) || '';
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
  b.addEventListener('click', () => {
    const t = b.dataset.tag;
    setTagSel(selectedTag === t ? '' : t);
  });
});

document.getElementById('edit-save').addEventListener('click', async () => {
  if (!currentUser || !editingCardId) return;
  const btn = document.getElementById('edit-save');
  btn.disabled = true; btn.textContent = 'Salvando...';
  const row = {
    user_id: currentUser.id,
    card_id: editingCardId,
    title: document.getElementById('edit-title').value.trim() || (currentUser?.email === MAIN_TEMPLATE_EMAIL ? D[editingCardId]?.t : '') || editingCardId,
    description: document.getElementById('edit-desc').value.trim(),
    activity_link: document.getElementById('edit-link').value.trim() || null,
    lesson_date: document.getElementById('edit-date').value || null,
    tags: selectedTag || null,
    updated_at: new Date().toISOString()
  };
  try {
    await upsertCard(row);
    userCards[editingCardId] = { title: row.title, description: row.description, activityLink: row.activity_link || '', lessonDate: row.lesson_date || '', tags: row.tags || '' };
    const col = editingCardId.startsWith('i') ? 'i' : 'a';
    renderCol(col, currentUser.email === MAIN_TEMPLATE_EMAIL);
    updatePills();
    closeAllModals();
    showToast('✓ Aula salva', 'ok');
  } catch (e) { showToast(e.message, 'err'); }
  btn.disabled = false; btn.textContent = 'Salvar aula';
});

async function upsertCard(row) {
  if (!sb || !currentUser) return;
  const { error } = await Promise.race([
    sb.from('user_card_content').upsert(row, { onConflict: 'user_id,card_id' }),
    new Promise(r => setTimeout(() => r({ error: { message: 'timeout' } }), 10000))
  ]);
  if (!error) return;
  if (error.message === 'timeout') throw new Error('Timeout ao salvar — conexão lenta');
  const { error: de } = await sb.from('user_card_content').delete().eq('user_id', row.user_id).eq('card_id', row.card_id);
  if (de) console.warn('upsertCard delete:', de.message);
  const { error: e2 } = await sb.from('user_card_content').insert(row);
  if (e2) throw new Error(e2.message);
}

// ── LOAD USER CARDS ──
async function loadUserCards(hideTemplate) {
  if (!currentUser || !sb) return;
  const isOwner = currentUser.email === MAIN_TEMPLATE_EMAIL;
  const { data, error } = await sb.from('user_card_content')
    .select('card_id,title,description,activity_link,lesson_date,tags')
    .eq('user_id', currentUser.id);
  if (error) { console.warn('loadUserCards:', error.message); return; }
  (data || []).forEach(r => {
    userCards[r.card_id] = { title: r.title, description: r.description, activityLink: r.activity_link || '', lessonDate: r.lesson_date || '', tags: r.tags || '' };
  });
  // Owner: sync D[] template cards not yet saved in the DB (runs once)
  if (isOwner) {
    const missingIds = Object.keys(D).filter(id => !userCards[id]);
    if (missingIds.length > 0) await syncTemplateToDb(missingIds);
  }
  renderSchedule(isOwner);
}

// Save D[] template cards to user_card_content so they appear in the gallery
async function syncTemplateToDb(ids) {
  if (!currentUser || !sb || !ids.length) return;
  const rows = ids.map(id => {
    const tmpl = D[id];
    return {
      user_id: currentUser.id,
      card_id: id,
      title: tmpl.t || id,
      description: (tmpl.tp || []).join('\n'),
      activity_link: null,
      lesson_date: null,
      tags: null,
      updated_at: new Date().toISOString()
    };
  });
  const { error } = await sb.from('user_card_content')
    .upsert(rows, { onConflict: 'user_id,card_id' });
  if (error) { console.warn('syncTemplateToDb:', error.message); return; }
  // Update local userCards
  rows.forEach(r => {
    userCards[r.card_id] = { title: r.title, description: r.description, activityLink: '', lessonDate: '', tags: '' };
  });
  console.log(`[syncTemplateToDb] ${rows.length} cards sincronizados para o banco`);
}

// ── PREFERENCES ──
async function ensurePreferences() {
  if (!currentUser || !sb) return;
  const isOwner = currentUser.email === MAIN_TEMPLATE_EMAIL;
  const { data, error } = await sb.from('user_preferences').select('*').eq('user_id', currentUser.id).maybeSingle();
  if (error) console.warn('[ensurePreferences] erro ao buscar:', error.message, error.code);
  if (data) {
    console.log('[ensurePreferences] prefs carregadas:', { turmas: data.turmas_json, start: data.start_date, wd: data.weekdays_json });
    userPreferences = data;
    // Owner com start_date errado ou ausente → corrige silenciosamente
    if (isOwner && data.start_date !== '2026-02-23') {
      await _createOwnerDefaultPrefs();
    } else {
      applyCalendarDates();
      renderSchedule(isOwner);
      updateProfileView();
    }
  } else {
    console.warn('[ensurePreferences] sem preferências para', currentUser.email);
    if (isOwner) {
      await _createOwnerDefaultPrefs();
    } else {
      renderSchedule(isOwner);
      openWizard();
    }
  }
}

function applyCalendarDates() {
  if (!userPreferences) return;
  const startDate = userPreferences.start_date;
  if (!startDate) return;
  let wdPerTurma = userPreferences.weekdays_json || [[1, 3], [2, 4]];
  if (!Array.isArray(wdPerTurma[0])) wdPerTurma = [wdPerTurma, wdPerTurma]; // legacy
  const calendarJson = {};
  wdPerTurma.forEach((wd, idx) => {
    if (!wd || !wd.length) return;
    const cal = calcLessonDates(startDate, wd, 33);
    Object.entries(cal).forEach(([k, v]) => { calendarJson[`t${idx}_${k}`] = v; });
  });
  // Sempre recalcula (garante formato correto e datas atualizadas)
  userPreferences.calendar_json = calendarJson;
}

// ── OWNER DEFAULT PREFS ──
// Cria preferências padrão para a conta principal sem precisar de wizard
async function _createOwnerDefaultPrefs() {
  const START_DATE = '2026-02-23'; // início real do semestre FIEC 2026
  const WEEKDAYS = [[1, 3], [1, 3]]; // ambas turmas: Seg + Qua
  const TURMAS = ['Intermediário', 'Avançado'];
  const calendarJson = {};
  WEEKDAYS.forEach((wd, idx) => {
    const cal = calcLessonDates(START_DATE, wd, 33);
    Object.entries(cal).forEach(([k, v]) => { calendarJson[`t${idx}_${k}`] = v; });
  });
  const err = await savePreferences({
    turmaCount: 2, cycleType: 'mod12', moduleCount: 1,
    startDate: START_DATE, turmas: TURMAS,
    allowAiEdits: false, weekdays: WEEKDAYS,
    calendarJson, displayName: 'Professora Gemi'
  });
  if (err) console.warn('[_createOwnerDefaultPrefs]', err);
  // Recarrega do banco (mas mantém calendarJson calculado localmente, pois weekdays_json pode ter caído no fallback)
  const { data } = await sb.from('user_preferences').select('*').eq('user_id', currentUser.id).maybeSingle();
  if (data) {
    userPreferences = data;
    // Garante weekdays corretos e recalcula datas a partir dos valores conhecidos
    userPreferences.weekdays_json = WEEKDAYS;
    userPreferences.start_date = START_DATE;
    userPreferences.calendar_json = calendarJson;
  }
  renderSchedule(true);
  updateProfileView();
}

// ── SAVE PREFERENCES ──
async function savePreferences(prefs) {
  if (!currentUser || !sb) return null;
  const fullRow = {
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

  async function tryUpsert(row) {
    const { error } = await Promise.race([
      sb.from('user_preferences').upsert(row, { onConflict: 'user_id' }),
      new Promise(r => setTimeout(() => r({ error: { message: 'timeout' } }), 6000))
    ]);
    return error ? error.message : null;
  }

  let errMsg = await tryUpsert(fullRow);
  if (errMsg) {
    // Attempt 2: strip colunas novas (podem não existir no banco)
    const { weekdays_json, calendar_json, display_name, allow_ai_edits, ...basicRow } = fullRow;
    const e2 = await tryUpsert(basicRow);
    if (!e2) errMsg = null; else errMsg = e2;
  }
  if (errMsg) {
    // Attempt 3: delete + insert (funciona sem constraint UNIQUE)
    await sb.from('user_preferences').delete().eq('user_id', currentUser.id).then(() => { }).catch(() => { });
    const { weekdays_json, calendar_json, display_name, allow_ai_edits, ...basicRow } = fullRow;
    const { error: ie } = await Promise.race([
      sb.from('user_preferences').insert(basicRow),
      new Promise(r => setTimeout(() => r({ error: { message: 'timeout' } }), 10000))
    ]);
    errMsg = ie ? ie.message : null;
  }

  if (errMsg) return errMsg;

  // Verify
  const { data: check } = await sb.from('user_preferences').select('user_id').eq('user_id', currentUser.id).maybeSingle();
  if (!check) {
    return `Dados não foram salvos. Execute este SQL no Supabase:\n\nALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS display_name text;\nALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS weekdays_json jsonb;\nALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS calendar_json jsonb;\nALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS allow_ai_edits boolean DEFAULT false;\n\nALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;\nDROP POLICY IF EXISTS "write_own" ON user_preferences;\nCREATE POLICY "write_own" ON user_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);\nDROP POLICY IF EXISTS "read_all" ON user_preferences;\nCREATE POLICY "read_all" ON user_preferences FOR SELECT USING (true);`;
  }
  return null;
}

// ── WIZARD ──
let onbStep = 1;
const ONB_TOTAL = 5;

function openWizard() {
  onbStep = 1;
  const prefs = userPreferences;
  // Pre-fill
  document.getElementById('onb-start').value = prefs?.start_date || '';
  document.getElementById('onb-display-name').value = prefs?.display_name || currentUser?.user_metadata?.display_name || '';

  // Cycle
  const cyc = prefs?.cycle_type || 'mod12';
  document.querySelectorAll('#onb-cycle .seg-btn').forEach(b => {
    b.classList.toggle('sel', b.dataset.val === cyc);
  });
  // Mods
  const mods = String(prefs?.module_count || 1);
  document.querySelectorAll('#onb-mods .seg-btn').forEach(b => {
    b.classList.toggle('sel', b.dataset.val === mods);
  });
  // Turma count
  const tc = String(prefs?.turma_count || 2);
  document.querySelectorAll('#onb-turma-count .seg-btn').forEach(b => {
    b.classList.toggle('sel', b.dataset.val === tc);
  });
  // AI
  const ai = String(prefs?.allow_ai_edits || false);
  document.querySelectorAll('#onb-ai .seg-btn').forEach(b => {
    b.classList.toggle('sel', b.dataset.val === ai);
  });

  let wdPerTurma = prefs?.weekdays_json || [[1, 3], [2, 4]];
  if (!Array.isArray(wdPerTurma[0])) wdPerTurma = [wdPerTurma, wdPerTurma];
  renderTurmaFields(Number(tc), prefs?.turmas_json || [], wdPerTurma);

  renderWizardStep();
  document.getElementById('onb-msg').className = 'onb-msg';
  document.getElementById('onb-msg').textContent = '';
  openModal('onb-modal');
}

function renderTurmaFields(count, names = [], wdPerTurma = []) {
  console.log('[renderTurmaFields] names:', names);
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
      return `<label class="wd-label${chk ? ' checked' : ''}" data-day="${d.v}">
            <input type="checkbox" value="${d.v}"${chk ? ' checked' : ''}> ${d.l}
          </label>`;
    }).join('')}
      </div>`;
    container.appendChild(block);
  }
  // Checkbox toggle visual
  container.querySelectorAll('.wd-label input').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.parentElement.classList.toggle('checked', cb.checked);
    });
  });
}

function getPerTurmaWeekdays() {
  return [...document.querySelectorAll('#onb-turmas .turma-weekdays')].map(block =>
    [...block.querySelectorAll('input[type=checkbox]:checked')].map(cb => Number(cb.value))
  );
}

function renderWizardStep() {
  document.querySelectorAll('.onb-step').forEach((s, i) => {
    s.classList.toggle('active', i + 1 === onbStep);
  });
  // Step indicator
  const ind = document.getElementById('step-ind');
  ind.innerHTML = '';
  for (let i = 1; i <= ONB_TOTAL; i++) {
    const d = document.createElement('div');
    d.className = `step-dot${i < onbStep ? ' done' : i === onbStep ? ' curr' : ''}`;
    ind.appendChild(d);
  }
  document.getElementById('onb-back').style.display = onbStep > 1 ? '' : 'none';
  document.getElementById('onb-next').textContent = onbStep === ONB_TOTAL ? 'Salvar' : 'Próximo';
  // Update turma fields when reaching step 3
  if (onbStep === 3) {
    const count = Number(getSegVal('onb-turma-count')) || 2;
    const cur = document.querySelectorAll('#onb-turmas .turma-block').length;
    if (cur !== count) renderTurmaFields(count, [], getPerTurmaWeekdays());
  }
  if (onbStep === ONB_TOTAL) buildSummary();
}

function getSegVal(groupId) {
  return document.querySelector(`#${groupId} .seg-btn.sel`)?.dataset.val || '';
}

function buildSummary() {
  const turmaCount = Number(getSegVal('onb-turma-count')) || 1;
  const wdPerTurma = getPerTurmaWeekdays();
  const names = [...document.querySelectorAll('.turma-name')].map(i => i.value.trim());
  const DAYNAMES = ['', 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  let html = `<b>Ciclo:</b> ${getSegVal('onb-cycle')}<br>`;
  html += `<b>Módulos:</b> ${getSegVal('onb-mods')}<br>`;
  html += `<b>Início:</b> ${document.getElementById('onb-start').value || '—'}<br>`;
  html += `<b>Turmas:</b> ${turmaCount}<br>`;
  for (let i = 0; i < turmaCount; i++) {
    const nm = names[i] || `Turma ${i + 1}`;
    const wd = (wdPerTurma[i] || []).map(d => DAYNAMES[d]).join(', ') || '—';
    html += `<b>${escHtml(nm)}:</b> ${wd}<br>`;
  }
  html += `<b>IA auto-editar:</b> ${getSegVal('onb-ai') === 'true' ? 'Sim' : 'Não'}`;
  document.getElementById('onb-summary').innerHTML = html;
}

document.getElementById('onb-next').addEventListener('click', async () => {
  if (onbStep < ONB_TOTAL) {
    if (onbStep === 3) {
      const count = Number(getSegVal('onb-turma-count')) || 1;
      const cur = document.querySelectorAll('#onb-turmas .turma-block').length;
      if (cur !== count) renderTurmaFields(count, [], getPerTurmaWeekdays());
    }
    onbStep++;
    renderWizardStep();
    return;
  }
  // Save
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

  // Build calendar
  const calendarJson = {};
  wdPerTurma.forEach((wd, idx) => {
    if (!wd.length) return;
    const cal = calcLessonDates(startDate, wd, 33);
    Object.entries(cal).forEach(([k, v]) => { calendarJson[`t${idx}_${k}`] = v; });
  });

  if (displayName) {
    currentUser.user_metadata = currentUser.user_metadata || {};
    currentUser.user_metadata.display_name = displayName;
    try { await sb.auth.updateUser({ data: { display_name: displayName } }); } catch { }
  }

  const prefs = {
    turmaCount, cycleType: getSegVal('onb-cycle'), moduleCount: Number(getSegVal('onb-mods')),
    startDate, turmas: turmaNames, allowAiEdits, weekdays: wdPerTurma, calendarJson, displayName
  };
  const err = await savePreferences(prefs);
  btn.disabled = false; btn.textContent = 'Salvar';
  if (err) {
    console.error('[savePreferences]', err);
    onbMsg.className = 'onb-msg err'; onbMsg.textContent = err;
    return;
  }
  // Set userPreferences locally immediately from built prefs object
  userPreferences = {
    user_id: currentUser.id,
    turma_count: prefs.turmaCount,
    cycle_type: prefs.cycleType,
    module_count: prefs.moduleCount,
    start_date: prefs.startDate || null,
    turmas_json: prefs.turmas,
    allow_ai_edits: prefs.allowAiEdits,
    weekdays_json: prefs.weekdays,
    calendar_json: calendarJson,
    display_name: prefs.displayName || null
  };
  applyCalendarDates();
  // Also attempt to reload from DB
  try {
    const { data } = await sb.from('user_preferences').select('*').eq('user_id', currentUser.id).maybeSingle();
    if (data) { userPreferences = data; applyCalendarDates(); }
  } catch { }
  // Atualiza topbar com display_name novo
  const email = currentUser?.email || '';
  document.getElementById('topbar-title').innerHTML = `Meu Cronograma <span>${escHtml(currentUser?.user_metadata?.display_name || email)}</span>`;
  renderSchedule(currentUser.email === MAIN_TEMPLATE_EMAIL);
  updatePills();
  updateProfileView();
  closeAllModals();
  showToast('✓ Configurações salvas!', 'ok');
  // Load cards so they appear immediately
  await loadUserCards(currentUser.email === MAIN_TEMPLATE_EMAIL ? false : true);
});

document.getElementById('onb-back').addEventListener('click', () => { if (onbStep > 1) { onbStep--; renderWizardStep(); } });

// Turma count changes
document.getElementById('onb-turma-count').addEventListener('click', e => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  const count = Number(btn.dataset.val);
  renderTurmaFields(count, [], getPerTurmaWeekdays());
});

// Seg btn groups
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
  const name = userPreferences?.display_name || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || '—';
  document.getElementById('prof-name').textContent = name;
  const turmas = userPreferences?.turmas_json || [];
  document.getElementById('prof-turmas').textContent = turmas.length ? turmas.join(', ') : 'Não configurado';
  document.getElementById('prof-start').textContent = userPreferences?.start_date || 'Não configurado';
}

document.getElementById('prof-wizard').addEventListener('click', openWizard);
document.getElementById('prof-logout').addEventListener('click', async () => {
  const btn = document.getElementById('prof-logout');
  btn.disabled = true; btn.textContent = 'Saindo...';
  try {
    await Promise.race([
      sb.auth.signOut(),
      new Promise(r => setTimeout(r, 5000))
    ]);
  } catch (e) { console.warn('signOut error:', e); }
  currentUser = null; userPreferences = null; Object.keys(userCards).forEach(k => delete userCards[k]);
  btn.disabled = false; btn.textContent = 'Sair';
  showLanding();
});

// ── AUTH ──
let authBusy = false;

// Landing page buttons
document.getElementById('land-login-btn').addEventListener('click', () => openAuthModal('login'));
document.getElementById('land-register-btn').addEventListener('click', () => openAuthModal('register'));
document.getElementById('land-cta-btn').addEventListener('click', () => openAuthModal('register'));
document.getElementById('land-cta-login').addEventListener('click', () => openAuthModal('login'));

// Auth modal close
document.getElementById('auth-modal-close').addEventListener('click', () => {
  document.getElementById('auth-modal').classList.remove('open');
});
document.getElementById('auth-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('auth-modal'))
    document.getElementById('auth-modal').classList.remove('open');
});

document.getElementById('auth-toggle').addEventListener('click', () => {
  openAuthModal(authMode === 'login' ? 'register' : 'login');
});

document.getElementById('auth-submit').addEventListener('click', async () => {
  if (authBusy) return;
  authBusy = true;
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  const name = document.getElementById('auth-name').value.trim();
  const msgEl = document.getElementById('auth-msg');
  msgEl.className = 'auth-msg';
  if (!email || !pass) { msgEl.className = 'auth-msg err'; msgEl.textContent = 'Preencha e-mail e senha.'; authBusy = false; return; }
  try {
    if (authMode === 'login') {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      await applySession(data.user);
    } else {
      const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: { display_name: name || email.split('@')[0] } } });
      if (error) throw error;
      if (data.user && !data.session) {
        msgEl.className = 'auth-msg ok';
        msgEl.textContent = 'Conta criada! Confirme seu e-mail para entrar.';
      } else if (data.user) {
        await applySession(data.user);
      }
    }
  } catch (e) { msgEl.className = 'auth-msg err'; msgEl.textContent = e.message; }
  authBusy = false;
});

document.getElementById('auth-email').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('auth-pass').focus(); });
document.getElementById('auth-pass').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('auth-submit').click(); });

// ── GOOGLE LOGIN ──
document.getElementById('auth-google').addEventListener('click', async () => {
  const btn = document.getElementById('auth-google');
  btn.disabled = true;
  await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
  btn.disabled = false;
});

// ── EXCEL IMPORT ──
document.getElementById('import-excel-btn').addEventListener('click', () => {
  document.getElementById('excel-input').click();
});

document.getElementById('excel-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file || !currentUser) return;
  if (typeof XLSX === 'undefined') { showToast('SheetJS não carregou', 'err'); return; }
  const btn = document.getElementById('import-excel-btn');
  btn.disabled = true; btn.textContent = '⏳ Importando...';
  try {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab);
    const rows = [];
    // Mapa de prefixos por sheet: sheet 0 → 'i', sheet 1 → 'a', sheet 2 → 'c', sheet 3 → 'd'
    const prefixMap = ['i', 'a', 'c', 'd'];
    wb.SheetNames.forEach((sheetName, si) => {
      const prefix = prefixMap[si] || 'i';
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!json.length) return;
      const hdrs = Object.keys(json[0]).map(h => ({ k: h, l: h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') }));
      const col = (...terms) => hdrs.find(h => terms.some(t => h.l.includes(t)))?.k;
      const numCol = col('aula', 'num', '#', 'n.', 'lesson', 'n°');
      const titleCol = col('titulo', 'title', 'nome', 'assunto', 'tema');
      const descCol = col('conteudo', 'topico', 'descri', 'topic', 'content', 'detalhe');
      const linkCol = col('link', 'url', 'atividade', 'acesso');
      json.forEach((row, i) => {
        const rawNum = numCol ? String(row[numCol]).trim() : '';
        const isEnc = /enc/i.test(rawNum) || /encerramento/i.test(titleCol ? String(row[titleCol]) : '');
        const num = isEnc ? 'enc' : parseInt(rawNum) || i + 1;
        const cardId = isEnc ? 'enc' : `${prefix}${num}`;
        const title = titleCol ? String(row[titleCol]).trim() : cardId;
        if (!title) return;
        rows.push({
          user_id: currentUser.id,
          card_id: cardId,
          title: title || cardId,
          description: descCol ? String(row[descCol]).trim() : '',
          activity_link: linkCol ? String(row[linkCol]).trim() : '',
          lesson_date: null, tags: null,
          updated_at: new Date().toISOString()
        });
      });
    });
    if (!rows.length) { showToast('Nenhuma linha encontrada no Excel', 'err'); return; }
    const { error } = await sb.from('user_card_content').upsert(rows, { onConflict: 'user_id,card_id' });
    if (error) throw new Error(error.message);
    rows.forEach(r => { userCards[r.card_id] = { title: r.title, description: r.description, activityLink: r.activity_link || '', lessonDate: '', tags: '' }; });
    renderSchedule(currentUser.email === MAIN_TEMPLATE_EMAIL);
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
    if (error || !data?.length) {
      grid.innerHTML = '<div class="empty-state"><p>Nenhum cronograma público ainda.</p></div>';
      return;
    }
    grid.innerHTML = data.map(p => {
      const turmas = p.turmas_json || [];
      const nm = p.display_name || 'Professor(a) sem nome';
      return `
      <div class="gal-card" onclick="openPublicSchedule('${p.user_id}')">
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
      sb.from('user_preferences').select('turmas_json,display_name,calendar_json').eq('user_id', userId).maybeSingle(),
      sb.rpc('get_public_cards', { p_user_id: userId })
    ]);
    if (error) throw new Error(error.message);
    const turmas = prefs?.turmas_json || ['Turma 1', 'Turma 2'];
    const name = prefs?.display_name || 'Professor(a)';
    document.getElementById('pub-sched-title').textContent = `${name} — Cronograma`;
    document.getElementById('pub-col-i-name').textContent = turmas[0] || 'Turma 1';
    document.getElementById('pub-col-a-name').textContent = turmas[1] || 'Turma 2';
    document.getElementById('pub-col-b-name').textContent = turmas[2] || 'Turma 3';
    const pubColB = document.getElementById('pub-col-b');
    pubColB.style.display = turmas.length >= 3 ? '' : 'none';
    document.getElementById('pub-sched-grid').classList.toggle('cols-3', turmas.length >= 3);
    const calJson = prefs?.calendar_json || {};
    const isViewingOwner = (userId === currentUser?.id && currentUser?.email === MAIN_TEMPLATE_EMAIL);

    // Build card map — for owner, merge D[] template as fallback
    const cardMap = {};
    if (isViewingOwner) {
      Object.entries(D).forEach(([id, tmpl]) => {
        cardMap[id] = { title: tmpl.t || id, description: (tmpl.tp || []).join('\n'), lessonDate: '', tags: '' };
      });
    }
    (cards || []).forEach(r => {
      cardMap[r.card_id] = { title: r.title, description: r.description, lessonDate: r.lesson_date || '', tags: r.tags || '' };
    });

    // Render each column
    const pubPrefixes = turmas.length >= 3 ? ['i', 'a', 'b'] : ['i', 'a'];
    pubPrefixes.forEach((prefix, colIdx) => {
      const container = document.getElementById(`pub-cards-${prefix}`);
      container.innerHTML = '';
      let shown = 0;
      const cardIds = [...Array.from({ length: 20 }, (_, i) => `${prefix}${i + 1}`)];
      if (['a', 'b'].includes(prefix)) cardIds.push('enc');
      cardIds.forEach(id => {
        const card = cardMap[id];
        if (!card) return;
        const n = id.match(/\d+/)?.[0] || '';
        const dateStr = card.lessonDate || (calJson[`t${colIdx}_lesson_${n}`] || calJson[`lesson_${n}`] || '');
        const lc = document.createElement('div');
        lc.className = 'lc' + (D[id]?.enc ? ' enc-card' : '');
        let dateHtml = '';
        if (dateStr) {
          const { day, mo, wd } = formatDateBR(dateStr);
          dateHtml = `<div class="lc-day">${day}</div><div class="lc-month">${mo}</div><div class="lc-wd">${wd}</div>`;
        } else {
          dateHtml = `<div class="lc-no-date">${D[id]?.m || '#' + n}</div>`;
        }
        lc.innerHTML = `
          <div class="lc-date">${dateHtml}</div>
          <div class="lc-body">
            <div class="lc-title">${escHtml(card.title || id)}</div>
            ${card.description ? `<div class="lc-desc">${escHtml(card.description.split('\n')[0])}</div>` : ''}
          </div>
          <div class="lc-right"><span class="lc-num">#${n}</span>${card.tags ? `<div class="tag-dot ${card.tags}"></div>` : ''}</div>`;
        container.appendChild(lc);
        shown++;
      });
      document.getElementById(`pub-col-${prefix}-count`).textContent = `${shown} aula${shown !== 1 ? 's' : ''}`;
      if (!shown) container.innerHTML = '<div style="padding:20px;color:var(--text-muted);font-size:13px">Nenhuma aula cadastrada.</div>';
    });
  } catch (e) {
    document.getElementById('pub-sched-title').textContent = 'Erro ao carregar';
    document.getElementById('pub-cards-i').innerHTML = `<div style="padding:20px;color:var(--red);font-size:13px">${escHtml(e.message)}</div>`;
  }
}

document.getElementById('gallery-refresh').addEventListener('click', loadPublicSchedules);

// ── CYCLE TAB CLICK ──
document.getElementById('cycle-btn-1').addEventListener('click', () => {
  if (currentCycle === 1) return;
  currentCycle = 1;
  const isOwner = currentUser?.email === MAIN_TEMPLATE_EMAIL;
  renderSchedule(isOwner);
});
document.getElementById('cycle-btn-2').addEventListener('click', () => {
  if (currentCycle === 2) return;
  currentCycle = 2;
  const isOwner = currentUser?.email === MAIN_TEMPLATE_EMAIL;
  renderSchedule(isOwner);
});

// ── PUBLIC SCHEDULE OVERLAY ──
document.getElementById('pub-sched-close').addEventListener('click', () => {
  document.getElementById('pub-sched-overlay').classList.remove('open');
});

// ── AI SUGGESTIONS ──
async function loadAiSuggestions() {
  if (!currentUser || !sb) return;
  try {
    const { data } = await sb.from('ai_suggestions')
      .select('id,card_id,field,current_value,suggested_value,reason,status,created_at')
      .eq('user_id', currentUser.id).eq('status', 'pending')
      .order('created_at', { ascending: false }).limit(50);
    suggestionsPending = data || [];
    updateSuggBadge();
  } catch { }
}

function updateSuggBadge() {
  const b = document.getElementById('sugg-badge');
  const n = suggestionsPending.length;
  b.textContent = n; b.style.display = n > 0 ? '' : 'none';
}

function renderAiSuggestions() {
  const list = document.getElementById('sugg-list');
  if (!suggestionsPending.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">Nenhuma sugestão pendente.</div>';
    return;
  }
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
        <button class="sugg-reject" onclick="handleSugg('${s.id}','reject')">✕ Rejeitar</button>
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
        const col = s.card_id.startsWith('i') ? 'i' : 'a';
        renderCol(col, currentUser.email === MAIN_TEMPLATE_EMAIL);
      }
    }
    await sb.from('ai_suggestions').update({ status: action === 'approve' ? 'approved' : 'rejected', updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', currentUser.id);
    suggestionsPending = suggestionsPending.filter(x => x.id !== id);
    renderAiSuggestions();
    updateSuggBadge();
    showToast(action === 'approve' ? '✓ Mudança aplicada' : 'Sugestão rejeitada', action === 'approve' ? 'ok' : '');
  } catch (e) { if (item) item.style.opacity = '1'; showToast(e.message, 'err'); }
}

// ── CHAT ──
let chatOpen = false;
function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chat-box').classList.toggle('open', chatOpen);
  if (chatOpen) document.getElementById('chat-input').focus();
}

document.getElementById('chat-close').addEventListener('click', () => { chatOpen = false; document.getElementById('chat-box').classList.remove('open'); });
document.getElementById('chat-fab-top').addEventListener('click', toggleChat);

function addChatMsg(role, text) {
  const log = document.getElementById('chat-log');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

document.getElementById('chat-send').addEventListener('click', sendChat);
document.getElementById('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });

async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  addChatMsg('user', msg);
  chatHistory.push({ role: 'user', content: msg });

  // Build card context
  const cardContext = Object.entries(userCards).slice(0, 10).map(([id, c]) => ({ card_id: id, title: c.title, description: c.description }));

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: msg,
        userId: currentUser?.id,
        allowAiEdits: userPreferences?.allow_ai_edits || false,
        cardContext,
        history: chatHistory.slice(-10)
      })
    });
    const json = await res.json();
    const answer = json.answer || json.error || 'Sem resposta.';
    addChatMsg('ai', answer);
    chatHistory.push({ role: 'assistant', content: answer });
    if (json.suggestions?.length) {
      suggestionsPending = [...json.suggestions, ...suggestionsPending];
      updateSuggBadge();
    }
    // Auto-apply
    if (userPreferences?.allow_ai_edits && json.suggestions?.length) {
      const errors = [];
      await Promise.all(json.suggestions.map(async s => {
        try {
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
        } catch (e) { errors.push(e.message); }
      }));
      if (errors.length) showToast(`Erro ao aplicar: ${errors[0]}`, 'err');
      else showToast(`✓ IA aplicou ${json.suggestions.length} sugestão(ões)`, 'ok');
      renderSchedule(currentUser.email === MAIN_TEMPLATE_EMAIL);
    }
  } catch (e) { addChatMsg('ai', `Erro: ${e.message}`); }
}

// ── NAVIGATION ──
document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab === 'suggestions') {
      document.getElementById('sugg-panel').classList.toggle('open');
      renderAiSuggestions();
      return;
    }
    switchView(tab);
  });
});

document.getElementById('sugg-close').addEventListener('click', () => {
  document.getElementById('sugg-panel').classList.remove('open');
});

function switchView_postSchedule() {
  // nothing extra needed, renderSchedule is already called on login
}
document.getElementById('wizard-btn').addEventListener('click', openWizard);
document.getElementById('setup-btn').addEventListener('click', openWizard);

// Close modals
['onb-close', 'detail-close', 'detail-close2', 'edit-close', 'edit-close2'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', closeAllModals);
});
document.querySelectorAll('.modal-bg').forEach(bg => {
  bg.addEventListener('click', e => { if (e.target === bg) closeAllModals(); });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAllModals(); document.getElementById('sugg-panel').classList.remove('open'); } });

// Add card buttons
document.getElementById('add-i').addEventListener('click', () => {
  const p = currentCycle === 2 ? 'c' : 'i';
  const next = Object.keys(userCards).filter(k => k.startsWith(p) && /^\d+$/.test(k.slice(1))).length + 1;
  editCard(`${p}${next}`);
});
document.getElementById('add-a').addEventListener('click', () => {
  const p = currentCycle === 2 ? 'd' : 'a';
  const next = Object.keys(userCards).filter(k => k.startsWith(p) && /^\d+$/.test(k.slice(1))).length + 1;
  editCard(`${p}${next}`);
});
document.getElementById('add-b').addEventListener('click', () => {
  const p = currentCycle === 2 ? 'e' : 'b';
  const next = Object.keys(userCards).filter(k => k.startsWith(p) && /^\d+$/.test(k.slice(1))).length + 1;
  editCard(`${p}${next}`);
});

// ── HISTORY ──
async function loadChatHistory() {
  const log = document.getElementById('history-log');
  if (!currentUser || !sb) { log.innerHTML = '<div style="color:var(--text-muted);font-size:13px">Faça login para ver o histórico.</div>'; return; }
  log.innerHTML = '<div style="color:var(--text-muted);font-size:13px">Carregando...</div>';
  try {
    const { data, error } = await sb.from('chat_messages')
      .select('role,content,created_at')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) throw error;
    if (!data || !data.length) {
      log.innerHTML = '<div style="color:var(--text-muted);font-size:13px">Nenhuma mensagem no histórico ainda.</div>';
      return;
    }
    log.innerHTML = '';
    data.forEach(msg => {
      const div = document.createElement('div');
      div.className = `chat-msg ${msg.role === 'user' ? 'user' : 'ai'}`;
      div.textContent = msg.content;
      log.appendChild(div);
    });
    log.scrollTop = log.scrollHeight;
  } catch (e) {
    log.innerHTML = `<div style="color:var(--text-muted);font-size:13px">Erro ao carregar: ${escHtml(e.message)}</div>`;
  }
}

// ── PROFILE NAME SAVE ──
document.getElementById('prof-name-save').addEventListener('click', async () => {
  const input = document.getElementById('prof-name-input');
  const value = input.value.trim();
  if (!value) { showToast('Digite um nome', 'err'); return; }
  const btn = document.getElementById('prof-name-save');
  btn.disabled = true; btn.textContent = 'Salvando...';
  try {
    if (!sb || !currentUser) throw new Error('Não autenticado');
    const { error } = await Promise.race([
      sb.from('user_preferences').update({ display_name: value, updated_at: new Date().toISOString() }).eq('user_id', currentUser.id),
      new Promise((_, r) => setTimeout(() => r({ error: { message: 'Timeout — tente novamente' } }), 8000))
    ]);
    if (error) throw new Error(error.message || 'Erro ao salvar');
    if (userPreferences) userPreferences.display_name = value;
    if (currentUser) currentUser.user_metadata = { ...currentUser.user_metadata || {}, display_name: value };
    updateProfileView();
    const email = currentUser?.email || '';
    document.getElementById('topbar-title').innerHTML = `Meu Cronograma <span>${escHtml(value || email)}</span>`;
    input.value = '';
    showToast('✓ Nome atualizado', 'ok');
  } catch (e) { showToast(e.message, 'err'); }
  finally { btn.disabled = false; btn.textContent = 'Salvar'; }
});

// ── INIT ──
(async () => { await initSupabase(); })();
