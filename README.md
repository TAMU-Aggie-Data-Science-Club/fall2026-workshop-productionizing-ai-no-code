# Productionizing an LLM

Standalone visual workshop for Aggie Data Science Club. Seven concept pages and a configurable playground; no model services, accounts, or credentials.

This repository contains the browser activity for the nontechnical audience. The [technical workshop](https://github.com/TAMU-Aggie-Data-Science-Club/fall2026-workshop-productionizing-ai) is maintained separately. Attendees use the published website; the commands below are only for officers developing it.

## Local preview

Use Node 22.13 or newer. On Windows PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev -- --hostname 127.0.0.1
```

Open the URL printed by the server (normally http://127.0.0.1:3000). The home URL redirects to `/streaming`. Other independent pages are `/tokens`, `/retrieval`, `/caching`, `/queues`, `/batching`, `/quality`, and `/playground`. Every page supports direct loading and refresh.
On macOS/Linux, use `npm` instead of `npm.cmd`.

## Checks

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

## Teaching notes

- Everything is simulated with fixed educational rules. Prices are fictional.
- Streaming distinguishes first generated token, first visible token, generation rate, and full completion.
- Document and answer examples are prepared, fictional material. Token pieces are illustrative, not a tokenizer implementation.
- Cache replay preserves the last request; Repeat question makes a new request against current facts and cache state. Clear cache invalidates saved information.
- Playground runs start with an empty cache. A hit requires an earlier matching request to have completed. In-flight duplicate requests are not coalesced.
- Workers represent real processing capacity; increasing an admission limit alone is not equivalent.
- Batching compares serial processing with fixed batches on one processor. Its collection window starts with the oldest waiting request; processor availability can add further delay. It uses equal-length requests and a fictional shared-work model, not continuous batching or a provider benchmark.
- Quality checks are authored examples, not an automated evaluator for arbitrary answers.
- Changing controls affects the next run. Navigating to another page unmounts animations; refresh resets the session.
- Reduced-motion preferences render completed results immediately.

`lib/simulation.ts` owns timing, costs, caching, and scheduling. `lib/content.ts` owns reference documents and prepared answers. No browser storage or analytics are used.

The optional WebMCP playground tool is feature-detected; browsers without that API use the same regular interface.

## Publish on Vercel

Import this repository into the club's Vercel account. Use the repository root (`./`) and the **Other** framework preset. `vercel.json` sets the install command (`npm ci`), build command (`npm run build`), static output (`dist/client`), and home-page redirect. No environment variables or model credentials are needed.

Use `main` for production and branches for changes and previews. Share the stable production URL with students and add it to the technical workshop README once deployed. Confirm that the production URL opens without a Vercel login.

The project retains its Sites scaffold and exports static HTML, JavaScript, CSS, and fonts. Only `dist/client` is deployed; no Python or application server is required. See [Vercel's Git deployment guide](https://vercel.com/docs/git).

The club's original panda icon is served unchanged from `public/adsc-logo.png`, downloaded from https://www.aggiedatascience.org/assets/panda_spring24_bw-xVJt98qa.png. It replaces the previous invented wordmark and favicon.

## Validation limits

Simulation and interaction tests use Node and jsdom. A production build and TypeScript check are included. A live browser was unavailable in the implementation session, so visual appearance, real-browser keyboard behavior, and the optional browser WebMCP integration still need a browser review. No automated test establishes that freshmen will finish in ten minutes; rehearse with a student before the event.
