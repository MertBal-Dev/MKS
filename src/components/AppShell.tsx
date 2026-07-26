import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { KullaniciKarti } from '@/components/KullaniciKarti';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  BookOpen,
  CalendarRange,
  Flame,
  GraduationCap,
  History,
  Home,
  Layers,
  ListChecks,
  MoreHorizontal,
  Settings,
  Sparkles,
  Upload,
  Timer,
  X,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { EXAM_DATE, EXAM_NAME } from '@/lib/constants';

const PRIMARY = [
  { to: '/', label: 'Ana Sayfa', icon: Home },
  { to: '/konular', label: 'Konular', icon: BookOpen },
  { to: '/soru-bankasi', label: 'Sorular', icon: ListChecks },
  { to: '/tekrar', label: 'Tekrar', icon: Layers },
  { to: '/soru-aileleri', label: 'Sorularla Öğren', icon: Sparkles },
] as const;

const SECONDARY = [
  { to: '/denemeler', label: 'Denemeler', icon: Timer },
  { to: '/kendi-sorularim', label: 'Kendi Sorularım', icon: Upload },
  { to: '/ai-hoca', label: 'AI Hoca', icon: GraduationCap },
  { to: '/cozduklerim', label: 'Çözdüklerim', icon: History },
  { to: '/yanlis-havuzu', label: 'Yanlış Havuzu', icon: XCircle },
  { to: '/istatistik', label: 'İstatistik', icon: BarChart3 },
  { to: '/plan', label: 'Çalışma Planı', icon: CalendarRange },
  { to: '/ayarlar', label: 'Ayarlar', icon: Settings },
] as const;

function SidebarLink({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Home }) {
  return (
    <NavLink to={to} end={to === '/'} className="relative block">
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="nav-active"
              className="absolute inset-0 rounded-xl bg-raised"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <span
            className={[
              'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
              isActive ? 'font-medium text-ink' : 'text-muted hover:text-ink',
            ].join(' ')}
          >
            <Icon size={18} strokeWidth={1.8} aria-hidden className={isActive ? 'text-mercan' : ''} />
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { state } = useAppState();
  const [sheetOpen, setSheetOpen] = useState(false);
  const examMode = location.pathname.startsWith('/sinav/') && !location.pathname.endsWith('/sonuc');

  if (examMode) {
    return <main className="min-h-dvh bg-ground">{children}</main>;
  }

  const moreActive = SECONDARY.some((s) => location.pathname.startsWith(s.to));
  const daysLeft = Math.max(Math.ceil((EXAM_DATE.getTime() - Date.now()) / 86_400_000), 0);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Masaüstü yan panel */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-1 border-r border-line bg-ground-deep/60 p-4 backdrop-blur lg:flex">
        <NavLink to="/" className="mb-5 block px-3 pt-2">
          <span className="font-display text-2xl font-semibold tracking-tight">MKS</span>
          <span className="mt-0.5 block text-[10px] tracking-[0.2em] text-muted">ÇALIŞMA ODASI</span>
        </NavLink>

        <nav className="flex flex-col gap-1">
          {[...PRIMARY, ...SECONDARY].map((l) => (
            <SidebarLink key={l.to} {...l} />
          ))}
        </nav>

        <div className="mt-auto space-y-2 px-1 pb-1">
          {state.streak.current > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
              <Flame size={17} className="shrink-0 text-mercan" aria-hidden />
              <div>
                <p className="text-xs text-muted">Çalışma serisi</p>
                <p className="font-display text-lg leading-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {state.streak.current} gün
                </p>
              </div>
            </div>
          )}
          <div className="px-2 text-[11px] leading-relaxed text-muted">
            {EXAM_NAME} • {daysLeft} gün
            <br />
            Turist Rehberliği MKS
          </div>
          <KullaniciKarti />
        </div>
      </aside>

      <main className="page-pad mx-auto w-full max-w-3xl px-4 pt-5 lg:px-10 lg:pt-9 xl:max-w-5xl 2xl:max-w-6xl">
        {children}
      </main>

      {/* Mobil alt sekme çubuğu */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-lg lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Ana gezinme"
      >
        {/* 5 ana bağlantı + "Daha" = 6 sütun; etiketler dar ekranda kırpılır */}
        <div className="mx-auto grid max-w-md grid-cols-6">
          {PRIMARY.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex min-w-0 flex-col items-center gap-1 px-0.5 py-2.5 text-[10px] transition-colors',
                  isActive ? 'text-mercan' : 'text-muted',
                ].join(' ')
              }
            >
              <Icon size={20} strokeWidth={1.8} aria-hidden />
              <span className="w-full truncate text-center">{label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={[
              'flex min-w-0 flex-col items-center gap-1 px-0.5 py-2.5 text-[10px] transition-colors',
              moreActive ? 'text-mercan' : 'text-muted',
            ].join(' ')}
          >
            <MoreHorizontal size={20} strokeWidth={1.8} aria-hidden />
            <span className="w-full truncate text-center">Daha</span>
          </button>
        </div>
      </nav>

      {/* "Daha" alt sayfası */}
      <AnimatePresence>
        {sheetOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Diğer sayfalar">
            <motion.button
              type="button"
              aria-label="Kapat"
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setSheetOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-surface p-4 pb-8"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            >
              <div className="mb-3 flex items-center justify-between px-2">
                <span className="text-sm font-medium text-muted">Diğer sayfalar</span>
                <button type="button" onClick={() => setSheetOpen(false)} aria-label="Kapat" className="text-muted">
                  <X size={20} />
                </button>
              </div>
              <div className="mb-3">
                <KullaniciKarti onGit={() => setSheetOpen(false)} />
              </div>

              {SECONDARY.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSheetOpen(false)}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                      isActive ? 'bg-raised font-medium text-ink' : 'text-muted',
                    ].join(' ')
                  }
                >
                  <Icon size={18} strokeWidth={1.8} aria-hidden />
                  {label}
                </NavLink>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
