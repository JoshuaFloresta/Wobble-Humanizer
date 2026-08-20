# HumanInzer - phased plan

Status as built: **Phases 1, 2 and 4 are complete. Phase 3 is complete except
for browser click-through tests.** Each phase below states its goals, tech choices, data model,
features and MVP criteria, with the criteria marked against what is verified
in the repository today.

## Decisions taken before building

| Question | Decision | Why it mattered |
| --- | --- | --- |
| Local model or heuristics? | **Deterministic rule pipeline**, behind an engine adapter | A model backend would have meant a ~300 MB download, seconds of latency per request, and no rule-level explanation. Rules give instant offline results and a trace for every edit. The adapter keeps a model backend available later. |
| Readability formulas? | **All six** up front | They are pure functions over one shared count pass; deferring them would have saved nothing. |
| Tone presets? | **All seven** up front | Each is a declarative rule plan, so adding presets is data, not code. |
| Database? | **Embedded MongoDB with an on-disk `dbPath`**, `MONGODB_URI` override | No mongod was installed on this machine. This ran with zero install and survived restarts. Superseded later: see "Storage, revisited" below. |
| History and export? | **In the MVP** | Both are cheap once runs are persisted, and versioning shapes the data model, so retrofitting it later would have meant a migration. |
| CSS? | **Tailwind v4** with CSS custom properties for theming | Fastest route to a responsive, accessible, theme-aware UI; tokens keep light/dark honest. |
| i18n? | **English only** (not asked, assumed) | Every formula, lexicon and rule here is English-specific. Adding a second language means a second linguistic stack, not a translation file. |

---

## Phase 1 - MVP (complete)

**Goal.** Paste text, choose a tone, get a rewrite with metrics and a copy
button, with every edit explained.

**Tech choices.** Node 24 + Express 4 (ESM throughout), Zod for validation,
Mongoose for persistence, React 19 + Vite 6 + Tailwind 4 on the client. No
runtime NLP dependency: tokenizer, syllable counter, POS tagger and
morphology are all in-repo, because the accuracy needed for a rule gate is
achievable in a few hundred lines and a dependency here would have been a
black box in the one place the app must be explainable.

**Data model.** `Run { title, contentOriginal, contentParaphrased, options,
metrics, trace, traceSummary, plan, passes, favorite, parentId, version,
createdAt, updatedAt }`. This is the requested `UserNote` shape with two
changes: history is a parent-pointer version chain rather than an embedded
`notesHistory` array, so each version keeps its own metrics and trace; and
`metrics` holds full before/after snapshots rather than two scalars.

**Features.** Paraphrase, six readability formulas, tone analysis, word diff,
rule trace, copy to clipboard, live metrics while typing.

**MVP criteria.**

- [x] Text in, rewrite out, for all seven tones
- [x] Readability score computed and displayed before and after
- [x] Tone adjustment demonstrably changes register (verified by test)
- [x] Copy button with confirmation and a legacy fallback
- [x] Every edit traceable to a named rule and reason
- [x] Same input plus same options produces byte-identical output (tested)
- [x] API validates input and returns per-field errors

---

## Phase 2 - Enhanced modules (complete)

**Goal.** Depth: more measurement, more control, and a history worth keeping.

**Features delivered.**

- Six readability formulas plus a consensus grade, audience note, and reading
  and speaking times
- Five reading-level targets with a measure-and-correct loop (up to three
  passes) that adjusts sentence-length targets and rule aggressiveness until
  the grade converges
- Seven tone presets, each a declarative plan
- Three intensity levels, which set the threshold a synonym swap must clear
- A "preserve these words" list for product names and jargon
- "Vary" - a new seed for a different but still reproducible rewrite
- History with search, favorites and parent-pointer versioning
- Export to Markdown, JSON and plain text, for saved and unsaved runs alike
- `localStorage` mirror so history survives with no database, with the UI
  stating which store is in use

**MVP criteria.**

- [x] Grade targets move the measured grade in the requested direction
- [x] History persists across restarts (embedded Mongo with on-disk dbPath)
- [x] Re-running a stored text creates a version rather than overwriting
- [x] Exports include metrics and the reasoning, not just the output text
- [x] The app degrades to local-only history instead of failing

---

## Phase 3 - UX, performance and polish (complete except browser tests)

**Goal.** Make it pleasant, fast and usable by keyboard and screen reader.

**Delivered.**

- Responsive layout: single column on phones, two on tablets, three-region
  grid on desktop
- Accessibility: skip link and landmarks; tablist with arrow-key navigation;
  radio-group tone picker; visible focus rings; `role="meter"` bars with
  `aria-valuenow`; live-region copy confirmation; diff marked by strikethrough
  and underline as well as colour; `prefers-reduced-motion` respected
- Theming: originally light/dark/system; later replaced by the hand-drawn
  paper theme, which is a single palette by design (see "Look, revisited")
- Performance: the rewrite runs in ~5-15 ms for a paragraph, so no worker or
  streaming is needed; live analysis is debounced at 250 ms and runs in-process
- Testing: 48 server and engine tests (42 by default, 6 opt-in storage), a headless render check that
  server-renders the app against the live API, and eight offline checks that
  run with every network call failing

**Offline mode (delivered after the first pass).** The engine was extracted
into `@humaninzer/engine`, a workspace package with no Node built-ins and no
third-party dependencies, and is now bundled into the client. Consequences:

- Rewriting, metrics and exports run in the page, so there is no request on
  the critical path and no spinner between typing and results
- Presets are computed from the bundled tables, so a cold start needs no
  network at all
- A service worker caches the shell (network-first for navigation,
  stale-while-revalidate for hashed assets, and `/api` never cached, because
  stale history is worse than no history)
- The browser computes and the server stores: `POST /api/runs` accepts a
  finished result instead of recomputing it, which also rules out any drift
  between what the user saw and what was saved
- `npm run test:offline` asserts byte-identical output between browser and
  server across all seven tones, and renders the app with every network call
  failing

**Still not done.**

- Response caching. Less useful than expected now that rewriting is local and
  costs a few milliseconds in-process; worth adding only for very long inputs.
- Browser-level click-through tests (Playwright). The render and offline
  checks cover rendering, content and a no-network cold start; they do not
  cover clicking through a real browser.
- Virtualized history for very long lists (currently capped at 50).

**MVP criteria.**

- [x] Usable at 360 px wide
- [x] Every control reachable and operable by keyboard
- [x] No colour-only signals
- [x] Rewrite feels instant (now in-process, no round trip)
- [x] Works with the network off
- [ ] Click-through tests in a real browser

---

## Phase 4 - Deployment and documentation (complete)

**Goal.** Runnable by someone who has not seen the code, on a clean machine.

**Delivered.**

- `npm install && npm run dev` is the entire setup; the database bootstraps
  itself
- `.env.example` documenting every setting, all of which have working
  defaults
- Health endpoint reporting persistence mode and engine availability
- README covering setup, the full API, the data model, engine design and
  its limits; this plan document alongside it

**MVP criteria.**

- [x] Clean-machine start with one command
- [x] No secrets or paid services required
- [x] API fully documented with request and response shapes
- [x] Known limits stated plainly rather than glossed over

---

## Storage, revisited

The original plan put history in MongoDB because that is what a MERN app
does. Once the engine moved into the browser, that reasoning no longer held:
the client computes the run, so the client is where the run naturally lives.

History is now stored in **IndexedDB as complete runs** -- full metrics, diff,
trace and plan -- so reopening an entry restores the result rather than just
the input text, which is what the earlier localStorage summary did. Server
persistence became opt-in (`PERSISTENCE=true`), and with it off nothing is
downloaded and no database runs.

What that cost and bought:

- **Removed:** a ~60 MB binary download on first run, ~300 MB of WiredTiger
  files on disk, and a startup dependency between the client and the API
- **Kept:** the entire server-side path, tested against a real embedded
  MongoDB, for anyone who wants history shared between browsers or surviving
  a clear of site data
- **Trade:** by default, history is per browser profile
- **Tests:** the storage suite still exists, but it is opt-in
  (`npm run test:storage`), because running it downloads a MongoDB binary onto
  a machine that no longer needs one. `npm test` reports those six as skipped
  rather than quietly dropping them.

  Status of that suite: it passed 6/6 against a real embedded MongoDB before
  the binary was removed from this machine. It has not been re-run since the
  opt-in gate was added, because `fastdl.mongodb.org` is unreachable from the
  environment this was built in, so the binary cannot be downloaded again
  here. The gate itself is verified -- the default run reports the six as
  skipped. Re-run it with `npm run test:storage` on a machine with network
  access, or against your own `mongod` with `MONGODB_URI`.

Docker was dropped at the same time. It existed to run a database the app no
longer needs by default, and an unverified deployment path is worse than no
deployment path.

---

## Look, revisited

The first build used a neutral light/dark UI. It was later restyled to a
hand-drawn paper theme: notebook surfaces, felt-tip headings, wobbly borders,
hard offset shadows, and a static tilt on every card.

Decisions worth recording:

- **Fonts are self-hosted**, not linked from Google Fonts. A CDN link would
  have meant the handwriting vanishes on a cold offline start -- the one case
  the app is built for. Two families, Latin and Latin-Extended, 80 KB total,
  precached by the service worker alongside the shell.
- **Dark mode was dropped.** The palette is seven fixed values with no dark
  variants, and inventing them would have meant new hues. The theme toggle
  went with it.
- **The palette has no green**, so the diff could not use the usual
  green/red convention. Insertions are ballpoint blue; corrections are
  ink-weight text with a marker-red rule struck through them, which reads as
  a marked-up page and survives colour blindness.
- **Contrast was measured, not assumed.** White on marker red is 3.3:1, so
  every element with that fill is 20px bold -- over the large-text threshold.
  Placeholders stay at the specified 40% ink and do not meet AA; they restate
  instructions present elsewhere, and the fix is one token if wanted.
- **Irregularity is deterministic**, keyed to item index rather than
  `Math.random()`, so cards do not reshuffle on every render.
- **The tone picker scrolls sideways.** Seven tones wrapped onto four lines
  and cost more vertical space than they earned. It is still a real radio
  group -- arrow keys move the selection and the browser scrolls the focused
  option into view -- with nudge buttons that appear only when the row
  actually overflows, and are hidden from assistive tech because they move
  the viewport rather than the selection.

  Three layout bugs surfaced while building it, all worth recording because
  each would have recurred:

  - A `fieldset` defaults to `min-width: min-content`, unlike any other
    element, so the strip pushed straight through the panel instead of
    clipping. Reset globally in the base layer.
  - A nested scroll container still contributes its scrollable width to its
    ancestors' `scrollWidth` in Chromium, which put a horizontal scrollbar on
    the whole page while nothing looked out of place. `overflow-x: clip` on
    the frame around the strip stops the propagation without creating a
    second scroller.
  - Component classes were beating Tailwind utilities: `.sketch-icon-circle`
    sets `display`, so `hidden md:flex` did nothing and the nudges showed on
    mobile. Fixed by moving the theme into `@layer base` and
    `@layer components`, which puts utilities in a later layer where they
    belong.

  Verified by rendering the app headlessly at a true 390px viewport and
  measuring `scrollWidth` against `innerWidth`, rather than by eye -- the
  first screenshots were misleading, because headless Edge renders at a
  minimum width and crops the image to the requested size.

---

## Summarisation (added after Phase 4)

A second mode alongside rewriting, built on the same principles.

**Extractive, not abstractive.** With no language model, writing new sentences
would mean inventing phrasing -- the thing the engine refuses to do when it
leaves an agentless passive alone. So it keeps real sentences, verbatim, in
document order, and a test asserts that every sentence in a summary appears in
the source.

**Scored on four signals**, weighted: shared vocabulary across the document
(0.55), position in the paragraph (0.20), names and figures (0.15), and
sentence length (0.10). Near-duplicates are dropped above 60% content-word
overlap so a summary does not spend two lines on one point.

**Composes with tone.** The extract is passed through the rewrite pipeline, so
a summary can also be made concise or academic. One trace covers both phases:
which sentences were kept and why, then which words were changed and why.

**Three lengths as ratios** (a fifth, a third, a half) rather than fixed
counts, because "three sentences" means different things for a paragraph and
a report. An explicit `sentences` count is accepted by the API.

Covered by ten engine tests and three API tests, plus an offline check.

---

## Phase 5 - Optional next steps

Not started; listed so the boundary of the current build is explicit.

1. **Second engine backend.** Register a local ONNX seq2seq model against the
   existing adapter contract and let the user pick per run. Worth doing only
   with the trace preserved: a model backend cannot explain its edits, so the
   UI should say so rather than showing an empty "Why" tab.
2. **Lexicon growth with guardrails.** The synonym lexicon covers 64 senses across 275 words.
   Growing it needs a review pass for sense drift - the failure mode that
   produced "results" becoming "consequences" during development, which was
   fixed by removing the entry rather than accepting the near-miss.
3. **Per-sentence controls.** Accept or reject individual edits from the trace
   panel, then recompute metrics.
4. **Side-by-side version compare.** The data model already supports it via
   the version chain; only the UI is missing.
