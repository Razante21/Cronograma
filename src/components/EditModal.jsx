import React, { useState, useEffect } from 'react';

const TAGS = [
  { id: 'green',  label: 'Verde',    color: 'var(--green)'    },
  { id: 'yellow', label: 'Amarelo',  color: 'var(--yellow)'   },
  { id: 'red',    label: 'Vermelho', color: 'var(--red)'      },
  { id: 'blue',   label: 'Azul',     color: 'var(--accent-b)' },
  { id: 'purple', label: 'Roxo',     color: 'var(--accent-i)' },
];

export default function EditModal({ cardId, cardData, templateData, onClose, onSave }) {
  const tmpl = templateData || {};
  const data = cardData || {};

  const [title, setTitle] = useState(data.title || tmpl.t || '');
  const [description, setDescription] = useState(
    data.description || (tmpl.tp ? tmpl.tp.join('\n') : '')
  );
  const [tags, setTags] = useState(data.tags || []);
  const [activityLink, setActivityLink] = useState(data.activityLink || '');
  const [lessonDate, setLessonDate] = useState(data.lessonDate || '');
  const [saving, setSaving] = useState(false);

  function toggleTag(tagId) {
    setTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(cardId, {
        title,
        description,
        tags,
        activityLink,
        lessonDate: lessonDate || null,
        done: data.done || false
      });
      onClose();
    } catch (err) {
      console.error('EditModal save error:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Editar Aula</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Título */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>
              Título
            </label>
            <input
              className="inp"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Título da aula"
            />
          </div>

          {/* Descrição */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>
              Descrição (uma linha por tópico)
            </label>
            <textarea
              className="inp"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tópico 1&#10;Tópico 2&#10;Tópico 3"
              rows={5}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Tags */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
              Tags
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TAGS.map(tag => {
                const active = tags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 7,
                      border: `1px solid ${active ? tag.color : 'var(--border)'}`,
                      background: active ? tag.color + '22' : 'transparent',
                      color: active ? tag.color : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      transition: 'all 0.15s'
                    }}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Link de atividade */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>
              Link de Atividade (opcional)
            </label>
            <input
              className="inp"
              value={activityLink}
              onChange={e => setActivityLink(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>

          {/* Data manual */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>
              Data manual (opcional — sobrescreve calendário)
            </label>
            <input
              className="inp"
              value={lessonDate}
              onChange={e => setLessonDate(e.target.value)}
              type="date"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
