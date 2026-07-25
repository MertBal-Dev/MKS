import { motion } from 'framer-motion';
import { GraduationCap, MessageCircleQuestion, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useAiHoca } from '@/hooks/useAiHoca';

const STARTERS = [
  { icon: Sparkles, text: 'Bugün hangi konuya çalışayım?', hint: 'Plana göre öneri ister' },
  { icon: MessageCircleQuestion, text: 'Selimiye ile Süleymaniye farkını anlat', hint: 'Karşılaştırmalı anlatım' },
  { icon: GraduationCap, text: 'Anadolu Medeniyetleri’nden 10 kritik tarih ver', hint: 'Hızlı tekrar listesi' },
  { icon: Sparkles, text: 'Sınav kaygımı nasıl yönetirim?', hint: 'Moral + teknik' },
];

export default function AiHocaPage() {
  const { openFreeChat, send } = useAiHoca();

  const start = (text?: string) => {
    openFreeChat();
    if (text) setTimeout(() => send(text), 60);
  };

  return (
    <div>
      <PageHeader eyebrow="ASİSTAN" title="AI Hoca"
        subtitle="Aklına takılan her şeyi sor — konu anlatımı, karşılaştırma, ezber tekniği, sınav taktiği."
      />

      <motion.button
        type="button"
        onClick={() => start()}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        className="mb-5 flex w-full items-center gap-4 rounded-(--radius-card) border border-kobalt/40 bg-gradient-to-br from-kobalt/15 to-transparent p-5 text-left"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-kobalt/20 text-kobalt" aria-hidden>
          <GraduationCap size={24} />
        </span>
        <span>
          <span className="font-display block text-lg font-semibold">Sohbeti başlat</span>
          <span className="text-sm text-muted">Yazarak istediğini sor; takip sorularıyla derinleşebilirsin.</span>
        </span>
      </motion.button>

      <h2 className="mb-3 text-sm font-medium text-muted">Hazır başlangıçlar</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {STARTERS.map(({ icon: Icon, text, hint }, i) => (
          <motion.button
            key={text}
            type="button"
            onClick={() => start(text)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -2 }}
            className="flex items-start gap-3 rounded-(--radius-card) border border-line bg-surface p-4 text-left transition-colors hover:border-kobalt/40"
          >
            <Icon size={18} className="mt-0.5 shrink-0 text-kobalt" aria-hidden />
            <span>
              <span className="block text-sm font-medium">{text}</span>
              <span className="text-xs text-muted">{hint}</span>
            </span>
          </motion.button>
        ))}
      </div>

      <p className="mt-6 rounded-xl border border-line bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        AI Hoca yalnızca emin olduğu, ders kitabı düzeyinde bilgileri paylaşacak biçimde ayarlandı.
        Yine de kritik bir tarihi çalışırken konu anlatımından da teyit etmen iyi olur.
        Sınav sırasında AI kapalıdır — deneme gerçek koşullarda yapılır.
      </p>
    </div>
  );
}
