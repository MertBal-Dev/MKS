import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  CalendarRange,
  History,
  Home,
  Layers,
  ListChecks,
  MoreHorizontal,
  Settings,
  Timer,
  X,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';

const PRIMARY = [
  { to: '/', label: 'Ana Sayfa', icon: Home },
  { to: '/konular', label: 'Konular', icon: BookOpen },
  { to: '/soru-bankasi', label: 'Sorular', icon: ListChecks },
  { to: '/tekrar', label: 'Tekrar', icon: Layers },
] as const;

const SECONDARY = [
  { to: '/denemeler', label: 'Denemeler', icon: Timer },
  { to: '/cozduklerim', label: 'Çözdüklerim', icon: History },
  { to: '/yanlis-havuzu', label: 'Yanlış Havuzu', icon: XCircle },
  { to: '/istatistik', label: 'İstatistik', icon: BarChart3 },
  { to: '/plan', label: 'Sprint Planı', icon: CalendarRange },
  { to: '/ayarlar', label: 'Ayarlar', icon: Settings },
] as const;

function navClass(isActive: boolean): string {
  return [
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
    isActive ? 'bg-raised text-ink font-medium' : 'text-muted hover:text-ink hover:bg-raised/60',
  ].join(' ');
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const examMode = location.pathname.startsWith('/sinav/') && !location.pathname.endsWith('/sonuc');

  if (examMode) {
    return <main className="min-h-dvh bg-ground">{children}</main>;
  }

  const moreActive = SECONDARY.some((s) => location.pathname.startsWith(s.to));

  return (
    <div className="min-h-dvh bg-ground lg:grid lg:grid-cols-[240px_1fr]">
      {/* Masaüstü yan panel */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-1 border-r border-line p-4 lg:flex">
        <NavLink to="/" className="mb-4 block px-3 pt-2">
          <span className="font-display text-xl font-semibold">MKS</span>
          <span className="block text-xs tracking-widest text-muted">ÇALIŞMA ODASI</span>
        </NavLink>
        {[...PRIMARY, ...SECONDARY].map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => navClass(isActive)}>
            <Icon size={18} strokeWidth={1.8} aria-hidden />
            {label}
          </NavLink>
        ))}
        <div className="mt-auto px-3 pb-1 text-[11px] leading-relaxed text-muted">
          Turist Rehberliği
          <br />
          Mesleğe Kabul Sınavı
        </div>
      </aside>

      <main className="page-pad mx-auto w-full max-w-3xl px-4 pt-4 lg:px-8 lg:pt-8 xl:max-w-5xl 2xl:max-w-6xl">
        {children}
      </main>

      {/* Mobil alt sekme çubuğu */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Ana gezinme"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {PRIMARY.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors',
                  isActive ? 'text-mercan' : 'text-muted',
                ].join(' ')
              }
            >
              <Icon size={21} strokeWidth={1.8} aria-hidden />
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={[
              'flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors',
              moreActive ? 'text-mercan' : 'text-muted',
            ].join(' ')}
          >
            <MoreHorizontal size={21} strokeWidth={1.8} aria-hidden />
            Daha
          </button>
        </div>
      </nav>

      {/* "Daha" alt sayfası */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Diğer sayfalar">
          <button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-black/50"
            onClick={() => setSheetOpen(false)}
          />
          <div className="rise-in absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-surface p-4 pb-8">
            <div className="mb-3 flex items-center justify-between px-2">
              <span className="text-sm font-medium text-muted">Diğer sayfalar</span>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Kapat" className="text-muted">
                <X size={20} />
              </button>
            </div>
            {SECONDARY.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSheetOpen(false)}
                className={({ isActive }) => navClass(isActive)}
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
