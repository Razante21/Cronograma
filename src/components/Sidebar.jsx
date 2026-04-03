import React from 'react';

const TABS = [
  {
    id: 'schedule',
    label: 'Cronograma',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    )
  },
  {
    id: 'gallery',
    label: 'Galeria',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87"/>
      </svg>
    )
  },
  {
    id: 'history',
    label: 'Histórico',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    )
  },
  {
    id: 'suggestions',
    label: 'Sugestões IA',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.2 6l-.8.6V18H9v-2.4l-.8-.6A7 7 0 0 1 12 2z"/>
        <path d="M9 21h6M10 18h4"/>
      </svg>
    )
  },
  {
    id: 'profile',
    label: 'Perfil',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    )
  }
];

export default function Sidebar({ activeTab, onTabChange, userEmail }) {
  const initial = userEmail ? userEmail[0].toUpperCase() : '?';

  return (
    <aside
      style={{
        width: 60,
        minHeight: '100vh',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 12,
        gap: 4,
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 50
      }}
    >
      {/* Avatar do usuário */}
      <div
        title={userEmail || 'Usuário'}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--accent-i)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 15,
          marginBottom: 12,
          cursor: 'default',
          userSelect: 'none'
        }}
      >
        {initial}
      </div>

      {/* Tabs */}
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            title={tab.label}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              border: 'none',
              background: isActive ? 'var(--accent-i)' : 'transparent',
              color: isActive ? '#fff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'var(--surface2)';
                e.currentTarget.style.color = 'var(--text)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }
            }}
          >
            {tab.icon}
          </button>
        );
      })}
    </aside>
  );
}
