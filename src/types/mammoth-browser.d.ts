/**
 * mammoth'un tarayıcı derlemesi tip tanımıyla gelmiyor.
 * Yalnızca kullandığımız yüzeyi bildiriyoruz.
 */
declare module 'mammoth/mammoth.browser.js' {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: unknown[] }>;
}
