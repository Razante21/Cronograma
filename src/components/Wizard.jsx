import React, { useState } from 'react';

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Wizard({ onClose, onSave, initialPrefs }) {
  const init = initialPrefs || {};
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(init.display_name || '');
  const [startDate, setStartDate] = useState(init.start_date || '2026-02-23');
  const [cycleType, setCycleType] = useState(init.cycle_type || 'mod20');
  const [turmaCount, setTurmaCount] = useState(init.turma_count || 2);
  const [turmas, setTurmas] = useState(
    init.turmas || ['Intermediário', 'Avançado', 'Terceira Turma']
  );
  const [weekdays, setWeekdays] = useState(
    init.weekdays || [[1, 3], [1, 3], [2, 4]]
  );
  const [allowAiEdits, setAllowAiEdits] = useState(
    init.allow_ai_edits !== undefined ? init.allow_ai_edits : true
  );
  const [saving, setSaving] = useState(false);

  const TOTAL_STEPS = 5;

  function updateTurmaName(idx, name) {
    setTurmas(prev => { const next = [...prev]; next[idx] = name; return next; });
  }

  function toggleWeekday(turmaIdx, wd) {
    setWeekdays(prev => {
      const next = [...prev];
      const cur = next[turmaIdx] || [];
      if (cur.includes(wd)) {
        next[turmaIdx] = cur.filter(d => d !== wd);
      } else {
        next[turmaIdx] = [...cur, wd].sort((a, b) => a - b);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        display_name: displayName,
        start_date: startDate,
        cycle_type: cycleType,
        turma_count: turmaCount,
        turmas: turmas.slice(0, turmaCount),
        weekdays: weekdays.slice(0, turmaCount),
        allow_ai_edits: allowAiEdits
      });
      onClose();
    } catch (err) {
      console.error('Wizard save error:', err);
    } finally {
      setSaving(false);
    }
  }

  function StepDots() {
    return (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div key={i} style={{
            width: i + 1 === step ? 20 : 8, height: 8,
            borderRadius: 4,
            background: i + 1 <= step ? 'var(--accent-i)' : 'var(--border)',
            transition: 'all 0.2s'
          }} />
        ))}
      </div>
    );
  }

  return (
    <div className="modal-bg">
      <div className="modal" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700 }}>Configurar Cronograma</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <StepDots />

        {/* Step 1: Nome + data de início */}
        {step === 1 && (
          <div className="fade-up">
            <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
              Informações básicas
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>
                  Nome de exibição
                </label>
                <input className="inp" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ex: Prof. Gemi" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>
                  Data de início do ciclo
                </label>
                <input className="inp" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Primeira aula do módulo. Feriados são ignorados automaticamente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Tipo de ciclo */}
        {step === 2 && (
          <div className="fade-up">
            <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
              Tipo de ciclo
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { id: 'mod20', label: 'Módulo 20 aulas', desc: 'Ciclo completo de 20 aulas por turma' },
                { id: 'mod12', label: 'Módulo 12 aulas', desc: 'Ciclo curto de 12 aulas' },
                { id: 'bimestral', label: 'Bimestral', desc: 'Organizado em bimestres' },
                { id: 'custom', label: 'Personalizado', desc: 'Defina o número de aulas manualmente' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setCycleType(opt.id)}
                  style={{
                    background: cycleType === opt.id ? 'var(--accent-i)22' : 'var(--surface2)',
                    border: `1px solid ${cycleType === opt.id ? 'var(--accent-i)' : 'var(--border)'}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: cycleType === opt.id ? 'var(--accent-i)' : 'var(--text)' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Turmas e dias da semana */}
        {step === 3 && (
          <div className="fade-up">
            <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
              Turmas
            </h4>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Número de turmas
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    onClick={() => setTurmaCount(n)}
                    style={{
                      flex: 1, padding: '8px 0',
                      borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
                      background: turmaCount === n ? 'var(--accent-i)' : 'var(--surface2)',
                      color: turmaCount === n ? '#fff' : 'var(--text)',
                      border: `1px solid ${turmaCount === n ? 'var(--accent-i)' : 'var(--border)'}`,
                      transition: 'all 0.15s'
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Array.from({ length: turmaCount }, (_, i) => (
                <div key={i} style={{
                  background: 'var(--surface2)', borderRadius: 10,
                  border: '1px solid var(--border)', padding: '12px 14px'
                }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Turma {i + 1}
                  </label>
                  <input
                    className="inp"
                    value={turmas[i] || ''}
                    onChange={e => updateTurmaName(i, e.target.value)}
                    placeholder={`Nome da turma ${i + 1}`}
                    style={{ marginBottom: 10 }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>
                    Dias da semana
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {[1, 2, 3, 4, 5].map(wd => {
                      const active = (weekdays[i] || []).includes(wd);
                      return (
                        <button
                          key={wd}
                          onClick={() => toggleWeekday(i, wd)}
                          style={{
                            flex: 1, padding: '6px 0',
                            borderRadius: 7, cursor: 'pointer',
                            fontSize: 11, fontWeight: 600,
                            background: active ? 'var(--accent-i)' : 'var(--surface)',
                            color: active ? '#fff' : 'var(--text-muted)',
                            border: `1px solid ${active ? 'var(--accent-i)' : 'var(--border)'}`,
                            transition: 'all 0.15s'
                          }}
                        >
                          {WEEKDAY_LABELS[wd]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: IA */}
        {step === 4 && (
          <div className="fade-up">
            <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
              Configuração de IA
            </h4>
            <div style={{
              background: 'var(--surface2)', borderRadius: 12,
              border: '1px solid var(--border)', padding: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    Sugestões automáticas de IA
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Permite que a IA analise seus cards e sugira melhorias de título e descrição para enriquecer o conteúdo.
                  </div>
                </div>
                <button
                  onClick={() => setAllowAiEdits(!allowAiEdits)}
                  style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: allowAiEdits ? 'var(--accent-i)' : 'var(--border)',
                    border: 'none', cursor: 'pointer',
                    position: 'relative', flexShrink: 0,
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute', top: 3,
                    left: allowAiEdits ? 23 : 3,
                    transition: 'left 0.2s'
                  }} />
                </button>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5 }}>
              As sugestões aparecem no painel lateral e você aprova ou rejeita individualmente antes de qualquer alteração ser salva.
            </p>
          </div>
        )}

        {/* Step 5: Revisão */}
        {step === 5 && (
          <div className="fade-up">
            <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
              Revisão
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Nome', value: displayName || '—' },
                { label: 'Início', value: startDate },
                { label: 'Ciclo', value: cycleType },
                { label: 'Turmas', value: turmas.slice(0, turmaCount).join(', ') || '—' },
                {
                  label: 'Dias',
                  value: weekdays.slice(0, turmaCount).map((wds, i) =>
                    `${turmas[i] || `T${i+1}`}: ${wds.map(d => WEEKDAY_LABELS[d]).join('/')}`
                  ).join(' | ')
                },
                { label: 'IA ativa', value: allowAiEdits ? 'Sim' : 'Não' }
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  background: 'var(--surface2)', borderRadius: 8,
                  padding: '8px 12px', gap: 12
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text)', textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navegação */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 24 }}>
          <button
            className="btn btn-ghost"
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
          >
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>
          {step < TOTAL_STEPS ? (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>
              Próximo
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar configuração'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
