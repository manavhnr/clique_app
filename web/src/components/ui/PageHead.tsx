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

/** Standard page header: mono kicker, display headline, optional aside. */
export default function PageHead({ kicker, title, accent, aside }: PageHeadProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5 md:mb-8 md:pb-6">
      <div>
        <div className="clique-label mb-2">{kicker}</div>
        <h1 className="m-0 font-display text-[clamp(32px,9vw,48px)] font-bold leading-[0.95] tracking-[-0.03em] md:text-[clamp(40px,5vw,64px)]">
          {title}
          {accent && (
            <>
              <br />
              <span className="font-serif italic font-normal text-lime">{accent}</span>
            </>
          )}
        </h1>
      </div>
      {aside && <div className="text-right">{aside}</div>}
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
