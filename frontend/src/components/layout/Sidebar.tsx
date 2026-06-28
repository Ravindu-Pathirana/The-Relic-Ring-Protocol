'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { icon: 'dashboard', label: 'Universe Dashboard', href: '/dashboard' },
  { icon: 'simulation', label: 'Packet Simulator', href: '/simulator' },
  { icon: 'route', label: 'Packet Journey', href: '/journey' },
  { icon: 'analytics', label: 'Latency Analytics', href: '/analytics' },
  { icon: 'translate', label: 'Codex Translator', href: '/codex' },
  { icon: 'settings_input_component', label: 'Network Control', href: '/network' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col glass-panel">
      {/* Logo / Branding */}
      <div className="flex flex-col items-start gap-1 border-b border-border-white px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary animate-node-pulse" />
          <span className="text-headline-sm text-primary tracking-wider">
            RELIC RING
          </span>
        </div>
        <span className="text-label-caps text-on-surface-variant ml-5">
          Interplanetary v2.4
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group flex items-center gap-3 rounded-lg px-3 py-2.5
                text-body-sm transition-all duration-200
                ${
                  isActive
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }
              `}
            >
              <span className="material-symbols-outlined text-[20px]">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-border-white px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container">
            <span className="material-symbols-outlined text-[16px] text-on-primary-container">
              person
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-body-sm text-on-surface">Operator</span>
            <span className="text-label-caps text-on-surface-variant">
              ZETA-26 NODE
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
