import React from 'react';

const FIELD_LABEL = { title: 'Título', description: 'Descrição' };

export default function SuggestionPanel({ suggestions, loading, onApprove, onReject, onApproveAll, onLoad, cards, prefs }) {
  return (
    <div style={{ padding: '0 24px 24px', maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Sugestões de IA</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Claude analisa seus cards e sugere melhorias. Você aprova antes de salvar.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => onLoad?.(cards, prefs)}
          disabled={loading}
          style={{ flexShrink: 0 }}
        >
          {loading ? (
            <>
              <span className="spinning" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} />
              Analisando...
            </>
          ) : (
            <>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.2 6l-.8.6V18H9v-2.4l-.8-.6A7 7 0 0 1 12 2z"/>
                <path d="M9 21h6"/>
              </svg>
              Analisar
            </>
          )}
        </button>
      </div>

      {suggestions.length === 0 && !loading && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12, padding: 32,
          textAlign: 'center', color: 'var(--text-muted)'
        }}>
          <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }}>
            <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.2 6l-.8.6V18H9v-2.4l-.8-.6A7 7 0 0 1 12 2z"/>
            <path d="M9 21h6"/>
          </svg>
          <p style={{ fontSize: 14, fontWeight: 500 }}>Nenhuma sugestão ainda</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Clique em "Analisar" para que a IA revise seus cards.</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Botão aprovar todas */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn"
              onClick={() => onApproveAll?.()}
              style={{ background: 'var(--green)22', color: 'var(--green)', border: '1px solid var(--green)44', fontSize: 12 }}
            >
              Aprovar todas ({suggestions.length})
            </button>
          </div>

          {suggestions.map(sug => (
            <div key={sug.id} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12, padding: 16,
              animation: 'fadeUp 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{
                  background: 'var(--accent-i)22', color: 'var(--accent-i)',
                  border: '1px solid var(--accent-i)33',
                  borderRadius: 5, fontSize: 11, fontWeight: 700,
                  padding: '2px 8px'
                }}>
                  {sug.card_id}
                </span>
                <span style={{
                  background: 'var(--surface2)',
                  borderRadius: 5, fontSize: 11, fontWeight: 600,
                  padding: '2px 8px', color: 'var(--text-muted)'
                }}>
                  {FIELD_LABEL[sug.field] || sug.field}
                </span>
              </div>

              <div style={{
                background: 'var(--surface2)', borderRadius: 8,
                padding: '10px 12px', marginBottom: 10
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 5 }}>
                  Sugestão
                </div>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                  {sug.value}
                </div>
              </div>

              {sug.reason && (
                <div style={{
                  fontSize: 12, color: 'var(--text-muted)',
                  fontStyle: 'italic', marginBottom: 12, lineHeight: 1.4
                }}>
                  {sug.reason}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-danger"
                  onClick={() => onReject?.(sug.id)}
                  style={{ fontSize: 12, padding: '5px 12px' }}
                >
                  Rejeitar
                </button>
                <button
                  className="btn"
                  onClick={() => onApprove?.(sug)}
                  style={{
                    background: 'var(--green)22', color: 'var(--green)',
                    border: '1px solid var(--green)44', fontSize: 12, padding: '5px 12px'
                  }}
                >
                  Aprovar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
