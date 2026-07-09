# Product

## Register

product

## Users

Clique is a social-first nightlife app for India (Mumbai, Delhi, Bangalore, Chennai and other metros). Two primary users:

- **Guests** (18–30): out at night or planning to be, on their phones, dim rooms, high energy. They browse what's open tonight, request a spot, coordinate a squad, and show a QR pass at the door.
- **Hosts** (nightlife creators): people who throw house parties, warehouse nights, club events. They publish events, review requests, run the guest list, and hand their phone to the bouncer to scan passes at the door.

The web app is the guest + host product surface (Next.js at `/web`). The root landing page is the only brand surface; everything behind auth is task UI.

## Product Purpose

Discover what's happening tonight → request a spot → get on the list → show a QR pass at the door → the host runs the door from the same app. Bookings and payments (Razorpay/PayU) monetize the social layer. Success = the app feels like the digital version of the clipboard at the door and the flyer on the pole, not a ticketing SaaS.

## Brand Personality

Underground, editorial, physical. Three words: **after-dark print shop**. The interface should feel like nightlife ephemera — door ledgers, ticket stubs, rubber stamps, flyer typography — rendered with precision. Confident and a little insider-y ("you're on the list"), never corporate, never bubbly.

## Anti-references

- Ticketing SaaS (BookMyShow, Eventbrite dashboards): uniform card grids, hero-metric stat tiles, generic purple gradients.
- "AI slop": identical rounded-card grids, gradient text, glassmorphism, big-number-small-label stat cards, template landing sections.
- Instagram-clone softness: no bubbly gradients, no frosted glass.

## Design Principles

1. **Door artifacts, not dashboards.** Every surface maps to a physical nightlife object: the guest ledger, the ticket stub, the stamp, the flyer. Ledger rows with hairlines beat bordered card grids.
2. **Lime means live.** The lime accent is reserved for now/live/approved/you're-in moments. Hot pink means denied/sold-out/danger. Everything else stays ink and paper.
3. **One signature per view.** The serif-italic-lime flourish is the house signature — used at most once per screen, or it becomes a tic.
4. **Numbers are typography.** Times, counts, and indices are set big in the display face or mono; they carry hierarchy so decoration doesn't have to.
5. **Never break the door.** Every API call, button, and state that exists must keep working — redesign the skin, never the flow.

## Non-negotiable brand marks

- The CLIQUE wordmark in Funnel Display 800 with the pulsing lime dot is the logo. Never change the font or remove/alter the blinking dot.
- The existing color theme (ink/paper/cream/lime/hot/gold/sky) is locked.

## Accessibility & Inclusion

- Keep visible `:focus-visible` outlines (lime, 2px) everywhere.
- Respect `prefers-reduced-motion` (already globally handled — keep it).
- Microlabel color `--dim` (#8A8173) is the minimum contrast tier on ink; never go dimmer for text that must be read.
- Touch targets ≥ 44px on mobile; the app is used one-handed at night.
