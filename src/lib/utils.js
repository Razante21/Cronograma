import { FERIADOS_2026 } from './constants.js';

export function escHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function calcLessonDates(startDate, weekdays, count = 33) {
  // CRÍTICO: usar new Date(y, m-1, d) LOCAL — nunca ISO string (bug de timezone)
  const [y, m, d] = startDate.split('-').map(Number);
  let cur = new Date(y, m - 1, d);
  const result = {};
  let lesson = 1, max = 500;
  const wdSet = new Set(weekdays.map(Number));
  while (lesson <= count && max-- > 0) {
    const iso = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
    if (wdSet.has(cur.getDay()) && !FERIADOS_2026.has(iso)) {
      result[`lesson_${lesson}`] = iso;
      lesson++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export function formatDateBR(iso) {
  // Retorna { day, mo, wd } — ex: { day:'23', mo:'Fev', wd:'Seg' }
  if (!iso) return null;
  const [y, mo, d] = iso.split('-');
  const dt = new Date(Number(y), Number(mo)-1, Number(d));
  if (isNaN(dt.getTime())) return null;
  const wdNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const moNames = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return { day: d, mo: moNames[Number(mo)], wd: wdNames[dt.getDay()] };
}

export function getCardPrefix(col) {
  // i,c → turma 0; a,d → turma 1; b,e → turma 2
  if (['i','c'].includes(col)) return 0;
  if (['a','d'].includes(col)) return 1;
  return 2;
}

export function isoToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
