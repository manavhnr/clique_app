# Design

## Visual Theme

"After-dark print shop / door ledger." Near-black ink surfaces with warm paper text, hairline rules, dashed perforations, mono microlabels, oversized numerals, rotated stamp badges. Dark theme only (`color-scheme: dark`) — the app lives at night.

## Color Palette

Locked. Defined in `web/src/app/globals.css` and `web/tailwind.config.ts`:

| Token | Value | Role |
|---|---|---|
| `--ink` | `#0B0907` | Page background |
| `--paper` | `#F2EDE2` | Primary text |
| `--cream` | `#E8E1D2` | Secondary text |
| `--lime` | `#C9F36E` | Live / approved / primary action. The blinking logo dot. |
| `--hot` | `#FF3D6E` | Denied / sold out / danger |
| `--gold` | `#E8C46E` | Pending / draft |
| `--sky` | `#7DB4FF` | Info / checked-in |
| `--dim` | `#8A8173` | Microlabels (minimum text contrast) |
| `--line` / `--line-2` | `#1C1814` / `#2A2520` | Hairlines |
| `--card` | `#14110E` | Raised surface (use sparingly — prefer hairline ledgers over boxes) |

Category colors: house_party lime, club/warehouse hot, college/private gold, concert/listening sky (single map in `web/src/lib/theme.ts`).

## Typography

- **Display / brand:** Funnel Display (400/600/700/800). Wordmark = 800, letter-spacing -0.04em, always with the pulsing lime dot.
- **Serif accent:** Instrument Serif italic — the house signature, max once per screen.
- **Mono:** Geist Mono — microlabels (11px, uppercase, tracking .14em), numerals, stamps, buttons.
- Utilities: `.display-xxl/-xl/-l/-m`, `.clique-label`, `.text-italic-serif`.

## Components

- **Buttons:** pill radius, mono uppercase. Primary = ink-on-lime (never light text on lime). Secondary = hairline outline. Danger = hot tint.
- **Stamp:** bordered mono uppercase label, slight rotation (±1.5deg), used for statuses (SOLD OUT, ON THE LIST, DRAFT).
- **Ledger row:** hairline-separated rows (no boxes), left column carries a big time/index numeral, hover = well background + arrow reveal. Replaces card grids for lists.
- **Ticket stub:** perforated dashed rule with edge notches + barcode strip; used for passes.
- **Ticker:** thin marquee strip of mono text between sections (respects reduced motion).
- **Inputs:** numbered field labels (mono `01`, `02`…), well background `#0B0907`, hairline border, lime on focus — focus styling via CSS class, not JS handlers.
- **Empty states:** teach the next action, styled as a blank ledger page, not a circle-icon placeholder.

## Layout

- Desktop app shell: fixed sidebar (collapsible, persisted) + scrollable main. Mobile: top bar + drawer + bottom tab bar. Keep structure; skin is ledger-flavored.
- Page heads: mono kicker over display headline, hairline underneath, oversized stat or CTA right-aligned.
- Avoid uniform auto-fill card grids; lead with one featured object, then ledger rows.

## Bans (project-specific)

- No gradient text, no glassmorphism-as-default, no colored side-stripe borders, no big-number stat-card grids, no identical card grids, no em dashes in copy.
- Never restyle the wordmark or remove the blinking dot.
