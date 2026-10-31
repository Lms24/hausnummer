# Hausnummer

> „Gib mir a Hausnummer!“ is Austrian for "give me a ballpark figure".

A private mortgage calculator that gives you exactly that for buying a home in or near Vienna, using Austrian lending rules. The UI is in German.

- Enter both net salaries (12× or 14× per year) and your own funds
- See the maximum loan and purchase price the Austrian rules allow
- Use a slider to set the split between own funds (Eigenmittel) and loan (Fremdkapital), with the allowed range shown in green
- Using all your own funds: see the maximum purchase price for any split (e.g. 50 : 50)
- Pick a term (5–35 years) and a rate type (variable or 5–30 years fixed)
- Monthly payment, principal vs. interest per month, per year and in total, plus a comparison of all terms

Inputs are stored only in the browser's `localStorage`. No backend, no analytics, no third-party requests. A strict Content-Security-Policy (`default-src 'self'`) enforces this.

## Run

Requires Node ≥ 22.17. The Node version is pinned via Volta in `package.json`.

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # calculation tests (also run before every build)
npm run build      # static site in ./build, host it anywhere
```

## Deploy

Live at **https://hausnummer.at**, served as static assets by Cloudflare Workers (see `wrangler.jsonc`).

Every push to `main` is built and deployed automatically by Cloudflare Workers Builds. The build runs the tests first, so a failing test stops the deploy. To deploy manually from your machine: `npm run deploy`.

## Austrian rules used (as of October 2026)

| Rule | Value | Notes |
|---|---|---|
| Loan-to-value (Beleihungsquote) | max. 90 % | Purchase costs come on top, so ~20 % of the price in own funds is typical |
| Debt service (Schuldendienstquote) | max. 40 % of net household income | Includes all other loan and leasing payments |
| Term | max. 35 years | Banks also usually want repayment by age 75–80 |
| Stress test | +2 pp (editable) | Applied to variable rates and fixed periods under 10 years |

These limits came from the **KIM-Verordnung** (1 Aug 2022 – 30 Jun 2025). Since 1 July 2025 they are no longer a binding regulation. They continue as an FMA circular, and the FMSG expects banks to deviate for at most 20 % of new loans per quarter. In practice, banks still apply them by default.

**Purchase costs (Kaufnebenkosten), Vienna and Lower Austria:** Grunderwerbsteuer 3.5 %, Grundbuch entry 1.1 %, Pfandrecht entry 1.2 % of the registered mortgage (usually ~120 % of the loan), agent fee up to 3 % + 20 % VAT, notary/lawyer + escrow ~1–2 % + VAT (default 1.5 %), bank processing fee 0–2 % (default 0.5 %). The temporary Grundbuch/Pfandrecht fee exemption for a main residence (up to €500k) applied only to applications filed before 1 July 2026, so it is **not** applied here.

**Default interest rates** (nominal, good credit, Oct 2026): variable 3.55 %, 5 y fixed 3.75 %, 10 y 4.00 %, 15 y 4.15 %, 20 y 4.20 %, 25 y 4.30 %, 30 y 4.40 %. All of these can be edited in the app.

The comparison table is built from:
- Optifin, 21 Oct 2026: variable 3.20 %, 10 y 3.75 %, 20 y 3.95 %, 30 y 4.35 % (best case); 3M Euribor 2.66 %
- Infina Kredit-Index, Oct 2026: variable 3.66 %, 20 y fixed 4.33 %; Q3 averages 10 y 4.21 %, 15 y 4.34 %
- OeNB: average rate on new housing loans 3.61 % (Aug 2026)

## Sources

- FMA – Wohnimmobilienkredite: https://www.fma.gv.at/banken/wohnimmobilienkredite/
- KIM-V expiry and the rules since July 2025: https://www.hausbaumagazin.at/kim-verordnung-ausgelaufen-wohnkredit-regeln-oesterreich/, https://www.check24.at/ratgeber/finanzratgeber/ende-kim-verordnung
- Rates: https://www.optifin.at/kreditzinsen-in-oesterreich/, https://immobilien-redaktion.com/artikel/wohnkredit-zinsen-2026-die-rate-reisst-wieder-die-40-prozent-marke
- Purchase costs: https://durchblicker.at/kaufnebenkosten, https://zp-immo.at/2025/08/12/nebenkosten-beim-immobilienkauf-in-wien/
- Fee exemption: https://www.bmf.gv.at/presse/pressemeldungen/2024/maerz/abschaffung-grundbuch-pfandrechtseintragung.html, https://linda.lindeverlag.at/Dokument/632776/

This is a planning tool, not financial advice. Get binding offers from at least two banks or a broker.

## License

MIT, see [LICENSE](LICENSE).
