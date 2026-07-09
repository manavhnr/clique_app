import { ReactNode } from 'react';

interface PageHeadProps {
  kicker: string;
  /** First line of the display headline. */
  title: ReactNode;
  /** Optional second line, set in italic serif lime — the house signature. Use sparingly. */
  accent?: ReactNode;
  /** Right-aligned slot: a stat, a CTA, anything. */
  aside?: ReactNode;
}

/**
 * Masthead-style page header: kicker rules out to both edges like a
 * newspaper section slug, headline below, aside bottom-aligned right.
 */
export default function PageHead({ kicker, title, accent, aside }: PageHeadProps) {
  return (
    <div className="mb-6 md:mb-8">
      <div className="flex items-center gap-3">
        <span className="h-px w-5 bg-line-2" aria-hidden />
        <div className="clique-label whitespace-nowrap">{kicker}</div>
        <span className="h-px flex-1 bg-line-2" aria-hidden />
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5 md:pb-6">
        <h1 className="m-0 font-display text-[clamp(32px,9vw,48px)] font-bold leading-[0.95] tracking-[-0.03em] md:text-[clamp(40px,5vw,64px)]">
          {title}
          {accent && (
            <>
              <br />
              <span className="font-serif italic font-normal text-lime">{accent}</span>
            </>
          )}
        </h1>
        {aside && <div className="text-right">{aside}</div>}
      </div>
    </div>
  );
}

/** Big numeric stat for the PageHead aside slot. */
export function HeadStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="clique-label">{label}</div>
      <div className="font-display text-4xl font-bold leading-none tracking-[-0.03em] md:text-[56px]">
        {typeof value === 'number' ? String(value).padStart(2, '0') : value}
      </div>
    </div>
  );
}
