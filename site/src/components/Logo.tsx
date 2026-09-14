export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" className="shrink-0">
      <rect x="1.5" y="1.5" width="37" height="37" rx="9" fill="none" stroke="#2f333c" strokeWidth="1.5" />
      <text x="5" y="28" fontFamily="ui-monospace,Menlo,monospace" fontSize="21" fontWeight="700" fill="#eef0f3">P</text>
      <text x="20" y="28" fontFamily="ui-monospace,Menlo,monospace" fontSize="21" fontWeight="700" fill="#1f9e8c">F</text>
    </svg>
  );
}
export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={'font-display font-extrabold tracking-[-.01em] ' + className}>Percept<span className="text-brand2">Folio</span></span>;
}
