import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Konu anlatımları için token uyumlu markdown görünümü. */
export function MarkdownView({ children, large = false }: { children: string; large?: boolean }) {
  return (
    <div
      className={[
        'space-y-3 leading-relaxed',
        large ? 'text-[1.05rem] leading-loose' : 'text-[0.95rem]',
        '[&_strong]:text-altin [&_strong]:font-semibold',
        '[&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-5',
        '[&_h4]:font-semibold [&_h4]:mt-4',
        '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5',
        '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5',
        '[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm',
        '[&_th]:border [&_th]:border-line [&_th]:bg-raised [&_th]:px-3 [&_th]:py-2 [&_th]:text-left',
        '[&_td]:border [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_td]:align-top',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-altin [&_blockquote]:pl-4 [&_blockquote]:text-muted',
        '[&_code]:rounded [&_code]:bg-raised [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em]',
      ].join(' ')}
    >
      <Markdown remarkPlugins={[remarkGfm]}>{children}</Markdown>
    </div>
  );
}
