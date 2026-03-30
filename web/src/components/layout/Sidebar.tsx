import { NavLink } from 'react-router-dom';

interface SidebarProps {
  onNewVideo: () => void;
}

const NAV_ITEMS = [
  { to: '/', label: 'Vídeos', icon: '🎬' },
  { to: '/config', label: 'Configurações', icon: '⚙️' },
  { to: '/guia', label: 'Guia de uso', icon: '📖' },
];

export function Sidebar({ onNewVideo }: SidebarProps) {
  return (
    <aside className="w-[260px] bg-surface border-r border-border flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-border">
        <h1 className="text-lg font-bold text-accent tracking-tight">
          ₿ Cripto CRM
        </h1>
        <p className="text-xs text-muted mt-1">Produção de vídeos</p>
      </div>

      <div className="p-4">
        <button
          onClick={onNewVideo}
          className="w-full px-4 py-2.5 bg-accent text-bg rounded-lg font-semibold text-sm hover:brightness-110 transition"
        >
          + Novo vídeo
        </button>
      </div>

      <nav className="flex-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition mb-1 ${
                isActive
                  ? 'bg-surface-3 text-text font-medium'
                  : 'text-soft hover:bg-surface-2'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
