import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppStateProvider } from '@/hooks/useAppState';
import { AppShell } from '@/components/AppShell';
import Dashboard from '@/pages/Dashboard';
import Konular from '@/pages/Konular';
import KonuDetay from '@/pages/KonuDetay';
import SoruBankasi from '@/pages/SoruBankasi';
import Pratik from '@/pages/Pratik';
import Denemeler from '@/pages/Denemeler';
import SinavOdasi from '@/pages/SinavOdasi';
import SinavSonuc from '@/pages/SinavSonuc';
import Tekrar from '@/pages/Tekrar';
import YanlisHavuzu from '@/pages/YanlisHavuzu';
import Istatistik from '@/pages/Istatistik';
import Plan from '@/pages/Plan';
import Ayarlar from '@/pages/Ayarlar';

export default function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/konular" element={<Konular />} />
            <Route path="/konular/:topicId" element={<KonuDetay />} />
            <Route path="/soru-bankasi" element={<SoruBankasi />} />
            <Route path="/pratik" element={<Pratik />} />
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
        </AppShell>
      </BrowserRouter>
    </AppStateProvider>
  );
}
