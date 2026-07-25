import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  title: string;
  subtitle?: string;
  /** Başlığın üstünde duran küçük bağlam etiketi (ör. "ÇALIŞMA"). */
  eyebrow?: string;
  action?: ReactNode;
}

/**
 * Sayfa başlığı. Üç katmanlı hiyerarşi kurar: küçük bağlam etiketi,
 * güçlü display başlık, sakin açıklama — böylece her sayfa aynı ritimle açılır.
 */
export function PageHeader({ title, subtitle, eyebrow, action }: Props) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5"
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
        )}
        <h1 className="font-display text-[1.75rem] font-semibold leading-tight lg:text-[2.125rem]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {action}
    </motion.header>
  );
}
