import React from 'react';
import { formatDateBR } from '../lib/utils.js';

const TAG_COLORS = {
  green: 'var(--green)',
  yellow: 'var(--yellow)',
  red: 'var(--red)',
  blue: 'var(--accent-b)',
  purple: 'var(--accent-i)',
};

export default function LessonCard({ cardId, cardData, templateData, dateStr, isPast, onClick }) {
  const tmpl = templateData || {};
  const data = cardData || {};

  const title = data.title || tmpl.t || 'Sem título';
  const descLines = data.description
    ? data.description.split('\n')
    : (tmpl.tp || []);
  const firstLine = descLines[0] || '';
  const lessonLabel = tmpl.m || data.lessonLabel || '';
  const done = data.done || tmpl.done || false;
  const tags = data.tags || [];
  const primaryTag = tags[0];

  // Número da aula — extrair do cardId ex: i3 → 3
  const numMatch = cardId.match(/\d+$/);
  const lessonNum = numMatch ? parseInt(numMatch[0], 10) : null;

  // Cor de destaque baseada no prefixo
  const prefix = cardId.replace(/\d+$/, '');
  let accentColor = 'var(--accent-i)';
  if (['a', 'd'].includes(prefix)) accentColor = 'var(--accent-a)';
  else if (['b', 'e'].includes(prefix)) accentColor = 'var(--accent-b)';
  if (cardId === 'enc') accentColor = 'var(--yellow)';

  const dateInfo = formatDateBR(dateStr);

  return (
    <div
      className={`lc fade-up${isPast ? ' past' : ''}${done ? ' done' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      style={{ borderLeftWidth: 3, borderLeftColor: accentColor, position: 'relative' }}
    >
      {/* Data à esquerda */}
      {dateInfo ? (
        <div style={{
          minWidth: 44,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'var(--surface2)',
          borderRadius: 8,
          padding: '6px 4px',
          flexShrink: 0
        }}>
          <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: 'var(--text)' }}>
            {dateInfo.day}
          </span>
          <span style={{ fontSize: 10, color: accentColor, fontWeight: 600, textTransform: 'uppercase' }}>
            {dateInfo.mo}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {dateInfo.wd}
          </span>
        </div>
      ) : (
        <div style={{ minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--surface2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 11, color: accentColor, fontWeight: 600 }}>
            {lessonLabel}
          </span>
          {primaryTag && (
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: TAG_COLORS[primaryTag] || 'var(--text-muted)',
              flexShrink: 0
            }} />
          )}
          {done && (
            <span style={{ marginLeft: 'auto', color: 'var(--green)' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </span>
          )}
        </div>
        <div style={{
          fontWeight: 600,
          fontSize: 13,
          color: 'var(--text)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {title}
        </div>
        {firstLine && (
          <div style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginTop: 2
          }}>
            {firstLine}
          </div>
        )}
      </div>

      {/* Número da aula */}
      {lessonNum && (
        <div style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          fontWeight: 600,
          flexShrink: 0,
          alignSelf: 'flex-start'
        }}>
          #{lessonNum}
        </div>
      )}
    </div>
  );
}
