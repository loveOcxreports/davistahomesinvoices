# Davista Homes — Invoice Desk

A dependency-free static web app for **Davista Homes** (short-let apartments,
Abuja & Lagos) staff to build a guest invoice, preview it as the exact A4
document, and export it to PDF.

No build step — plain HTML/CSS/JS, deployable to any static host (Netlify,
GitHub Pages, etc.) by pointing it at this directory.

## Files

| File | What it is |
|---|---|
| `index.html` | Page shell — loads `styles.css`, `lib.js`, `app.js`. |
| `lib.js` | Pure business-logic functions: `words`, `longDate`, `nightsBetween`, `money`, invoice totals, auto-numbering. No DOM, no storage — reusable as-is by the mobile app. |
| `app.js` | App state, rendering, and event wiring (editor, live preview, Saved, Guests, toasts). |
| `styles.css` | Design tokens and all app/document styling, including print rules for PDF export. |
| `icon-512.png` | App icon. |

## Running locally

Any static file server works, e.g.:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## PDF export

*Export PDF →* switches to the editor view and calls `window.print()`. The
print stylesheet (`@media print` in `styles.css`) hides all chrome and prints
only `.sheet` at A4 with 14mm margins — "Save as PDF" in the browser's print
dialog produces the invoice PDF.

## Data & persistence

Everything is stored in `localStorage`, offline-first, no backend:

| Key | Holds |
|---|---|
| `davista_invoices_v1` | Saved invoices |
| `davista_clients_v1` | Guest book |
| `davista_terms_v1` | Default terms & conditions |
| `davista_addr_v1` | Last-used property address |

## Business rules

See `lib.js` — ported verbatim from the design prototype. Notably:

- `nights = round((checkOut − checkIn) / 86400000)`, parsed as local midnight to avoid timezone drift.
- `lineTotal = unit × nights × price`; invoice total is the sum of line totals.
- Money formats as `N` + `en-NG` locale number (e.g. `N600,000.00`) — the prefix is the letter `N`, not `₦`, matching the client's original document.
- Amount-in-words is an English/Naira converter (Billion/Million/Thousand groups, hyphenated tens, optional Kobo).
- Auto-numbering: `max(existing invoice numbers, 34749) + 1`, zero-padded to 10 digits.

## Note on the invoice document

The invoice sheet content (column order, terms text, payment and signature
lines) is contractual — it reproduces the client's original invoice
verbatim and must not be reworded or reordered. One layout fix was made
during implementation: the "Line total" and "UNIT PRICE" columns use
`minmax(100px, max-content)` instead of a fixed `100px`, because the fixed
width clipped totals of 7+ digits (e.g. `N8,000,000.00`) against the
table's `overflow: hidden` rounded corners — a latent bug in the original
fixed-width design, not a content change.
