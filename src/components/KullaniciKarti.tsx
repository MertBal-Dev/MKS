import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { kullaniciAdi, oturumIzle, supabaseVar } from '@/lib/supabase';
import { SenkronRozeti } from '@/components/SenkronRozeti';

/**
 * Yan paneldeki hesap satırı — kim olarak çalıştığını ve ilerlemenin kayıtlı
 * olup olmadığını tek bakışta gösterir.
 *
 * Ayarlar'a götürüyor: hesapla ilgili yapılacak her şey (çıkış, giriş) zaten
 * orada. Girilmediğinde de görünür kalıyor — "ilerleme bu cihazda" uyarısını
 * görmemek, telefonda açıp boş bulmaktan iyi değil.
 */
export function KullaniciKarti({ onGit }: { onGit?: () => void }) {
  const [ad, setAd] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseVar) return;
    return oturumIzle((o) => setAd(o ? kullaniciAdi(o) : null));
  }, []);

  if (!supabaseVar) return null;

  // Kullanıcı adları ASCII; yine de Türkçe kurala göre büyütüyoruz ki
  // "ismail" baş harfi I değil İ olsun.
  const harf = ad ? ad.slice(0, 1).toLocaleUpperCase('tr') : '?';

  return (
    <NavLink
      to="/ayarlar"
      onClick={onGit}
      aria-label={ad ? `${ad} — hesap ayarları` : 'Giriş yap'}
      className={({ isActive }) =>
        [
          'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors',
          isActive ? 'border-line bg-raised' : 'border-line bg-surface hover:border-mercan/40',
        ].join(' ')
      }
    >
      <span
        className={[
          'grid size-8 shrink-0 place-items-center rounded-full font-display text-sm leading-none',
          ad ? 'bg-mercan/15 text-mercan' : 'bg-raised text-muted',
        ].join(' ')}
        aria-hidden
      >
        {harf}
      </span>
      <span className="min-w-0 flex-1">
        {ad ? (
          <>
            <span className="block truncate text-sm font-medium leading-tight">{ad}</span>
            <SenkronRozeti />
          </>
        ) : (
          <>
            <span className="block text-sm font-medium leading-tight">Giriş yapılmadı</span>
            <span className="block text-[11px] leading-relaxed text-muted">İlerleme bu cihazda kalıyor</span>
          </>
        )}
      </span>
    </NavLink>
  );
}
