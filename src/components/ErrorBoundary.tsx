import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Render hatasında beyaz ekran yerine anlaşılır bir kurtarma ekranı gösterir.
 *
 * Önemli olan: çalışma verisi localStorage'da durur, çökme onu silmez.
 * Öğrenciye bunu açıkça söylemek, sınav ortasında paniklememesini sağlar.
 */
interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[render hatası]', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid min-h-dvh place-items-center bg-ground px-6 text-ink">
        <div className="w-full max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold">Bir şeyler ters gitti</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Sayfa çizilirken beklenmeyen bir hata oluştu. <strong className="text-ink">Çalışma verilerin duruyor</strong> —
            çözdüğün sorular, kartların ve planın silinmedi.
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-mercan px-4 py-2.5 text-sm font-semibold text-mercan-ink"
            >
              <RefreshCw className="size-4" /> Tekrar dene
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-line px-4 py-2.5 text-sm font-medium"
            >
              Ana sayfaya dön
            </a>
          </div>

          <details className="mt-8 text-left">
            <summary className="cursor-pointer text-xs text-muted">Teknik ayrıntı</summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-surface p-3 text-[11px] text-muted">
              {error.message}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
