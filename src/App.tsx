import { useCallback, useEffect, useState } from 'react';
import { Giris } from '@/components/Giris';
import { oturumAl, oturumIzle, supabaseVar } from '@/lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppStateProvider } from '@/hooks/useAppState';
import { AiHocaProvider } from '@/hooks/useAiHoca';
import { AppShell } from '@/components/AppShell';
import { AiHocaPanel } from '@/components/AiHocaPanel';
import { BackupReminder } from '@/components/BackupReminder';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DuyguIntro } from '@/components/DuyguIntro';
import Dashboard from '@/pages/Dashboard';
import Konular from '@/pages/Konular';
import KonuDetay from '@/pages/KonuDetay';
import SoruBankasi from '@/pages/SoruBankasi';
import Pratik from '@/pages/Pratik';
import Cozduklerim from '@/pages/Cozduklerim';
import KendiSorularim from '@/pages/KendiSorularim';
import SoruAileleri from '@/pages/SoruAileleri';
import GunlukDenemeler from '@/pages/GunlukDenemeler';
import Denemeler from '@/pages/Denemeler';
import SinavOdasi from '@/pages/SinavOdasi';
import SinavSonuc from '@/pages/SinavSonuc';
import Tekrar from '@/pages/Tekrar';
import YanlisHavuzu from '@/pages/YanlisHavuzu';
import Istatistik from '@/pages/Istatistik';
import Plan from '@/pages/Plan';
import Ayarlar from '@/pages/Ayarlar';
import AiHocaPage from '@/pages/AiHoca';

/** Rota değişimlerinde içeriği yumuşakça değiştirir. */
function AnimatedRoutes() {
  const location = useLocation();
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/konular" element={<Konular />} />
          <Route path="/konular/:topicId" element={<KonuDetay />} />
          <Route path="/soru-bankasi" element={<SoruBankasi />} />
          <Route path="/pratik" element={<Pratik />} />
          <Route path="/cozduklerim" element={<Cozduklerim />} />
          <Route path="/kendi-sorularim" element={<KendiSorularim />} />
          <Route path="/soru-aileleri" element={<SoruAileleri />} />
          <Route path="/gunluk-denemeler" element={<GunlukDenemeler />} />
          <Route path="/ai-hoca" element={<AiHocaPage />} />
          <Route path="/denemeler" element={<Denemeler />} />
          <Route path="/sinav/:examId" element={<SinavOdasi />} />
          <Route path="/sinav/:examId/sonuc" element={<SinavSonuc />} />
          <Route path="/tekrar" element={<Tekrar />} />
          <Route path="/yanlis-havuzu" element={<YanlisHavuzu />} />
          <Route path="/istatistik" element={<Istatistik />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/ayarlar" element={<Ayarlar />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Oturum kapısı.
 *
 * Supabase yapılandırılmamışsa ya da kullanıcı "girmeden devam et" derse
 * uygulama eskisi gibi yalnızca localStorage ile çalışır — giriş zorunlu
 * değil, ilerlemeyi cihazlar arasında taşımak isteyene sunulan bir seçenek.
 */
function OturumKapisi({ children }: { children: React.ReactNode }) {
  const [durum, setDurum] = useState<'yukleniyor' | 'acik' | 'kapali'>(
    supabaseVar ? 'yukleniyor' : 'acik',
  );

  useEffect(() => {
    if (!supabaseVar) return;
    if (sessionStorage.getItem('mks:girisAtlandi')) {
      setDurum('acik');
      return;
    }
    let iptal = false;
    void oturumAl().then((s) => {
      if (!iptal) setDurum(s ? 'acik' : 'kapali');
    });
    return oturumIzle((s) => setDurum(s ? 'acik' : 'kapali'));
  }, []);

  if (durum === 'yukleniyor') return <div className="min-h-dvh bg-ground" />;
  if (durum === 'kapali') {
    return (
      <Giris
        onBasarili={() => {
          sessionStorage.setItem('mks:girisAtlandi', '1');
          setDurum('acik');
        }}
      />
    );
  }
  return <>{children}</>;
}

export default function App() {
  // İlk render'da okunur; aksi halde perde bir kare boyunca görünüp kaybolur.
  const [showIntro, setShowIntro] = useState(
    () => typeof window !== 'undefined' && !sessionStorage.getItem('hasSeenIntro'),
  );

  const handleIntroComplete = useCallback(() => {
    sessionStorage.setItem('hasSeenIntro', 'true');
    setShowIntro(false);
  }, []);

  return (
    <ErrorBoundary>
      <OturumKapisi>
        <AppStateProvider>
          <AiHocaProvider>
          <BrowserRouter>
            {showIntro && <DuyguIntro onComplete={handleIntroComplete} />}
            <AppShell>
              <AnimatedRoutes />
            </AppShell>
            <AiHocaPanel />
            <BackupReminder />
            </BrowserRouter>
          </AiHocaProvider>
        </AppStateProvider>
      </OturumKapisi>
    </ErrorBoundary>
  );
}
