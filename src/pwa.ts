/// <reference types="vite-plugin-pwa/client" />
import { registerSW } from 'virtual:pwa-register';

/**
 * Service worker kaydı ve otomatik güncelleme.
 *
 * Sorun: registerType 'autoUpdate' tek başına yetmiyordu. Yeni sürüm
 * yayınlandığında service worker güncelleniyor ama AÇIK OLAN SEKME eski
 * dosyalarla çalışmaya devam ediyor; kullanıcı Ctrl+Shift+R yapmadan
 * değişiklikleri görmüyordu.
 *
 * Çözüm üç parçalı:
 *   1. workbox tarafında skipWaiting + clientsClaim (vite.config.ts)
 *   2. Burada düzenli güncelleme yoklaması — sekme günlerce açık kalabilir
 *   3. Yeni worker kontrolü devralınca sayfayı BİR KEZ yeniden yükle
 */

/** Sonsuz döngüye girmemek için: yeniden yükleme yalnızca bir kez tetiklenir. */
let yenileniyor = false;

const YOKLAMA_ARALIGI_MS = 60_000;

export function registerPwa(): void {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (yenileniyor) return;
    yenileniyor = true;
    window.location.reload();
  });

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // Sekme uzun süre açık kalırsa güncellemeyi kendi başına fark etsin
      setInterval(() => {
        void registration.update();
      }, YOKLAMA_ARALIGI_MS);

      // Sekmeye geri dönüldüğünde de kontrol et — en sık karşılaşılan durum bu
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update();
      });
    },
  });
}
