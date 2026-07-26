import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';

/**
 * Senkron durumunu gösteren küçük satır.
 *
 * Sessiz kalması esas: her şey yolundaysa tek satır, tek renk. Yalnızca bir
 * sorun varsa dikkat çeker — sürekli yanıp sönen bir gösterge, sınavına
 * çalışan birinin son ihtiyacı olan şey.
 */
export function SenkronRozeti({ ayrintili = false }: { ayrintili?: boolean }) {
  const { senkron } = useAppState();
  if (senkron.durum === 'kapali') return null;

  const yaziyor = senkron.durum === 'yaziliyor' || senkron.durum === 'cekiliyor';
  const hata = senkron.durum === 'hata';

  const metin = hata
    ? 'Kaydedilemedi — tekrar denenecek'
    : yaziyor
      ? 'Kaydediliyor…'
      : 'İlerlemen kayıtlı';

  const Simge = hata ? CloudOff : yaziyor ? RefreshCw : Cloud;

  return (
    <div
      className={`flex items-center gap-2 text-[11px] leading-relaxed ${hata ? 'text-kizil' : 'text-muted'}`}
      role="status"
      aria-live="polite"
    >
      <Simge size={13} className={`shrink-0 ${yaziyor ? 'animate-spin' : ''}`} aria-hidden />
      <span>{metin}</span>
      {ayrintili && hata && senkron.hata && <span className="text-muted">({senkron.hata})</span>}
    </div>
  );
}
