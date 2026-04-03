import React from 'react';
import { formatDateBR } from '../lib/utils.js';

const TAG_LABELS = { green: 'Verde', yellow: 'Amarelo', red: 'Vermelho', blue: 'Azul', purple: 'Roxo' };
const TAG_COLORS = {
  green: 'var(--green)',
  yellow: 'var(--yellow)',
  red: 'var(--red)',
  blue: 'var(--accent-b)',
  purple: 'var(--accent-i)'
};

const BASE_FILES_URL = 'https://raw.githubusercontent.com/pcdsantos007/fiec-files/main/';

export default function DetailModal({ cardId, cardData, templateData, dateStr, onClose, onEdit, onToggleDone }) {
  const tmpl = templateData || {};
  const data = cardData || {};

  const title = data.title || tmpl.t || 'Sem título';
  const descLines = data.description
    ? data.description.split('\n').filter(Boolean)
    : (tmpl.tp || []);
  const done = data.done || tmpl.done || false;
  const tags = data.tags || [];
  const lessonLabel = tmpl.m || '';
  const arqs = tmpl.arq || [];
  const activityLink = data.activityLink || '';

  const dateInfo = formatDateBR(dateStr);

  // Prefixo para cor
  const prefix = (cardId || '').replace(/\d+$/, '');
  let accentColor = 'var(--accent-i)';
  if (['a', 'd'].includes(prefix)) accentColor = 'var(--accent-a)';
  else if (['b', 'e'].includes(prefix)) accentColor = 'var(--accent-b)';
  if (cardId === 'enc') accentColor = 'var(--yellow)';

  function getFileUrl(file) {
    if (file.ext || file.u?.startsWith('http')) return file.u;
    return BASE_FILES_URL + file.u;
  }

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
          {dateInfo && (
            <div style={{
              minWidth: 52,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'var(--surface2)',
              borderRadius: 10,
              padding: '8px 6px',
              flexShrink: 0
            }}>
              <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{dateInfo.day}</span>
              <span style={{ fontSize: 11, color: accentColor, fontWeight: 600, textTransform: 'uppercase' }}>{dateInfo.mo}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dateInfo.wd}</span>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: accentColor, fontWeight: 600, marginBottom: 4 }}>
              {lessonLabel}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3, marginBottom: 6 }}>{title}</h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tags.map(tag => (
                <span key={tag} style={{
                  background: TAG_COLORS[tag] + '22',
                  color: TAG_COLORS[tag],
                  border: `1px solid ${TAG_COLORS[tag]}44`,
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px'
                }}>
                  {TAG_LABELS[tag] || tag}
                </span>
              ))}
              {done && (
                <span style={{
                  background: 'var(--green)22',
                  color: 'var(--green)',
                  border: '1px solid var(--green)44',
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px'
                }}>
                  Concluída
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 4, borderRadius: 6, flexShrink: 0
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Tópicos */}
        {descLines.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Conteúdo
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {descLines.map((line, i) => (
                <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: accentColor, flexShrink: 0, marginTop: 5
                  }} />
                  <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Link de atividade */}
        {activityLink && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Link de Atividade
            </div>
            <a
              href={activityLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-i)', fontSize: 13, wordBreak: 'break-all' }}
            >
              {activityLink}
            </a>
          </div>
        )}

        {/* Arquivos */}
        {arqs.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Arquivos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {arqs.map((f, i) => (
                <a
                  key={i}
                  href={getFileUrl(f)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'var(--surface2)', borderRadius: 8,
                    padding: '8px 12px', textDecoration: 'none',
                    border: '1px solid var(--border)',
                    color: 'var(--text)', fontSize: 13,
                    transition: 'border-color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-i)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <svg width="14" height="14" fill="none" stroke="var(--accent-i)" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  {f.n}
                  {f.ext && (
                    <svg width="12" height="12" fill="none" stroke="var(--text-muted)" strokeWidth="2" viewBox="0 0 24 24" style={{ marginLeft: 'auto' }}>
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
          {onToggleDone && (
            <button
              className="btn"
              onClick={() => onToggleDone(cardId, !done)}
              style={{
                background: done ? 'transparent' : 'var(--green)22',
                color: done ? 'var(--text-muted)' : 'var(--green)',
                border: `1px solid ${done ? 'var(--border)' : 'var(--green)44'}`
              }}
            >
              {done ? 'Desmarcar' : 'Concluída'}
            </button>
          )}
          {onEdit && (
            <button className="btn btn-primary" onClick={() => onEdit(cardId)}>
              Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
