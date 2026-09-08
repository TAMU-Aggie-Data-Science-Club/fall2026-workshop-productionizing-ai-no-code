# Productionizing an LLM

Standalone visual workshop for Aggie Data Science Club. Seven concept pages, a configurable playground, and a final production challenge; no model services, accounts, or credentials.

This repository contains the browser activity for the nontechnical audience. The [technical workshop](https://github.com/TAMU-Aggie-Data-Science-Club/fall2026-workshop-productionizing-ai) is maintained separately. Attendees use the published website; the commands below are only for officers developing it.

## Local preview

Use Node 22.13 or newer. On Windows PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev -- --hostname 127.0.0.1
```

Open the URL printed by the server (normally http://127.0.0.1:3000/prod-ai/). The home URL opens the welcome page, which links to `/prod-ai/streaming`. Other independent pages are `/prod-ai/tokens`, `/prod-ai/retrieval`, `/prod-ai/caching`, `/prod-ai/queues`, `/prod-ai/batching`, `/prod-ai/quality`, and `/prod-ai/playground`. Every page supports direct loading and refresh.

The welcome screen shows the original sky-and-meadow background with subtle grain and a gentle 36-second drift. The card contains the ADSC logo and name, the title, a compact numbered list of workshop topics with dotted leaders, and a dark green start button. The card and all of its contents enter together in one soft animation. The topic list uses the same page sequence as lesson navigation. Its native start link also works without animation support or JavaScript. Reduced-motion preferences show everything immediately. Keyboard focus reveals the entire card immediately. Returning with the browser's Back button restores the welcome card. The 880 ms paper expansion is followed by a staggered lesson entrance, using the same background color across navigation.

The current backdrop is `public/images/workshop-sky.webp` (1672 × 941), generated with the built-in image-generation tool and compressed to WebP. Generation brief: “A wide natural editorial photograph of a dreamy pale cornflower-blue afternoon sky, warm ivory clouds framing an open center, distant sage meadow along the bottom, softly blurred grasses in the corners, nostalgic 35mm grain and atmospheric softness; no text, UI, people, or logos.” The alternate ground-level wheat image is retained as `public/images/workshop-wheat.webp`.

Each lesson has Previous and Next buttons at the bottom. The takeaway appears after a run; Streaming keeps a compact comparison when settings change between completed runs. Run applies edited settings, Replay repeats unchanged settings, and Restart cancels the active animation.
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

## Final challenge

`/prod-ai/challenge` follows Playground. Students configure model, context, output length, worker count, delivery, and caching, then test the same 20-request workload. It contains ten questions and ten repeats; two source facts change before the second wave. Each request uses the source version available at arrival. Every test starts with an empty cache, and only completed matching responses can be reused.

The requirements are at least 18 correct answers, a 90th-percentile first visible response within two seconds, a 90th-percentile full answer within six seconds, a total test cost no higher than 0.65 cents, and no outdated cache hits. Percentiles use the nearest-rank method and include queue wait. Token rates, worker prices, and generation timing come from the same shared rules as the lessons and Playground. Worker time is charged for all configured workers throughout the test. Prices remain fictional educational rates.

Accuracy is calculated from the visible prepared questions and answers, not a universal model quality percentage. Missing context, omitted exceptions, insufficient output length, selected model-specific mistakes, and stale responses can fail an answer. Extra context includes a worked policy example that helps the lightweight model with the two exception cases. Every answer and its expected reference can be reviewed after a run. Tests enumerate the configuration space to confirm multiple passing approaches and meaningful failures for the default and largest configurations.

A passing test transitions to a full-screen ending, using the welcome landscape and a wide summary card with the exact passing configuration and statistics. The root React provider holds the result in memory while it replaces the lesson screen; nothing is written to storage or a URL. Refresh returns to the initial challenge. Reduced motion skips the transitions; reset and unmount cancel pending exits.

## Publish on Vercel

Import this repository into the club's Vercel account. Use the repository root (`./`) and the **Other** framework preset. `vercel.json` sets the install command (`npm ci`), build command (`npm run build`), static output (`dist/client`), and home-page redirect. No environment variables or model credentials are needed.

Use `main` for production and branches for changes and previews. Share the stable production URL with students and add it to the technical workshop README once deployed. Confirm that the production URL opens without a Vercel login.

The custom workshop entry URL is `https://ws.aggiedatascience.org/prod-ai`. Add `ws.aggiedatascience.org` to this Vercel project's Production domains and complete the CNAME/TXT verification in Cloudflare. DNS only configures the hostname; the path is configured in this repository. The same `/prod-ai` paths work on the project's `vercel.app` domain.

`lib/paths.ts` defines the app prefix. Vite uses it for generated asset URLs, while plain navigation links and public images explicitly include it. `vercel.json` redirects `/` and the previously shared root lesson URLs into the workshop, then rewrites `/prod-ai/*` to the static files in `dist/client` (including the welcome page at `/prod-ai`). Keep these rules aligned if the prefix changes. `next.config.ts` enables `basePath` only for the development server; enabling it for production with the current vinext version causes its static prerenderer to skip the lessons. After deploying, check `/prod-ai`, direct lesson refreshes, Previous/Next, the logo, and the old `/streaming` link.

The project retains its Sites scaffold and exports static HTML, JavaScript, CSS, and fonts. Only `dist/client` is deployed; no Python or application server is required. See [Vercel's Git deployment guide](https://vercel.com/docs/git).

The club's original panda icon is served unchanged from `public/adsc-logo.png`, downloaded from https://www.aggiedatascience.org/assets/panda_spring24_bw-xVJt98qa.png. It replaces the previous invented wordmark and favicon.

## Validation limits

Simulation and interaction tests use Node and jsdom. A production build and TypeScript check are included. A live browser was unavailable in the implementation session, so visual appearance, real-browser keyboard behavior, and the optional browser WebMCP integration still need a browser review. No automated test establishes that freshmen will finish in ten minutes; rehearse with a student before the event.
