import type { ReactNode } from 'react';
import { CountdownInline } from './Countdown';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="rise-in mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold lg:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : <CountdownInline />}
      </div>
      {action}
    </header>
  );
}
