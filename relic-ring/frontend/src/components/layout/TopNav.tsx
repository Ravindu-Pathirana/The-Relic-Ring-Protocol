'use client';

export default function TopNav() {
  return (
    <header className="fixed top-0 left-64 right-0 z-30 flex h-16 items-center justify-between glass-panel px-6">
      {/* Search */}
      <div className="relative flex items-center">
        <span className="material-symbols-outlined absolute left-3 text-[18px] text-outline">
          search
        </span>
        <input
          type="text"
          placeholder="Search nodes, routes, packets..."
          className="h-9 w-72 rounded-lg bg-surface-container border border-border-white pl-10 pr-4
                     text-body-sm text-on-surface placeholder:text-outline
                     focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20
                     transition-colors"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Protocol Tag */}
        <div className="mr-4 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success-green animate-node-pulse" />
          <span className="text-label-caps text-on-surface-variant">
            RELIC RING PROTOCOL
          </span>
        </div>

        {/* Action Icons */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg
                     text-on-surface-variant hover:bg-surface-container-high
                     hover:text-on-surface transition-colors"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-[20px]">
            notifications
          </span>
        </button>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg
                     text-on-surface-variant hover:bg-surface-container-high
                     hover:text-on-surface transition-colors"
          aria-label="Terminal"
        >
          <span className="material-symbols-outlined text-[20px]">
            terminal
          </span>
        </button>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg
                     text-on-surface-variant hover:bg-surface-container-high
                     hover:text-on-surface transition-colors"
          aria-label="Network Graph"
        >
          <span className="material-symbols-outlined text-[20px]">
            account_tree
          </span>
        </button>
      </div>
    </header>
  );
}
