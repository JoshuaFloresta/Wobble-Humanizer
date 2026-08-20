# HumanInzer

A self-hosted writing workbench: paste text, pick a tone and a reading level,
and get a rewrite with **every edit explained**. Readability scores, tone
signals, a word-level diff and a rule-by-rule trace come back with each run.

No accounts, no API keys, no external calls, no paid tiers. The rewriting
engine is a deterministic rule pipeline that runs entirely on your machine:
the same input and settings always produce the same output.

**It works offline.** The engine ships inside the page, so rewriting, scoring
and exporting all happen in your browser with no round trip. The server is
only there to store history, and the app says plainly when it cannot reach
it. A rewrite computed in the browser is byte-identical to the same rewrite
computed on the server -- verified across all seven tones by `npm run test:offline`.

---

## Quick start

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>.

That is the whole setup -- nothing is downloaded, and there is no database to
install. Rewriting runs in the page, and history is kept in your browser
(IndexedDB) as complete runs, so reopening one restores its metrics, diff and
trace exactly as they were.

| Command | What it does |
| --- | --- |
| `npm run dev` | API on :4000 and client on :5173 together |
| `npm run dev:server` | API only |
| `npm run dev:client` | Client only |
| `npm run build` | Production client build into `client/dist` |
| `npm start` | Run the API in production mode |
| `npm test` | Server and engine tests (55; storage suite is opt-in) |
| `npm run test:offline` | Offline checks: engine parity and a cold start with no network |
| `npm run test:render` | Headless render check against a running API |
| `npm run test:storage` | Storage tests against an embedded MongoDB |
| `npm run test:all` | Tests plus offline checks |

### Do you need a database?

No. History lives in your browser and the API is optional -- the client
computes everything itself.

Turn on a server-side copy only if you want history shared between browsers,
or surviving a clear of site data. Set `PERSISTENCE=true` in `.env` and the
server runs an embedded MongoDB (a ~60 MB binary downloaded from
`fastdl.mongodb.org` on first run, data in `.data/mongo`; WiredTiger
preallocates, so expect a few hundred MB on disk). Set `MONGODB_URI` as well
to use Atlas or a local `mongod` you already run, which skips the download.

With persistence on, runs are written to both places: the browser copy stays
as a local mirror.

---

## What it does

**Seven tone presets.** Neutral, Formal, Casual, Concise, Persuasive,
Academic and Friendly. Each one is a declarative plan -- target register,
contraction policy, hedging policy, sentence-length target -- not a prompt.

**Five reading-level targets.** Match tone, Simple (grade 5-6), Standard
(8-9), Professional (11-12), Advanced (14+). The engine measures its own
output and runs corrective passes until it converges on the target.

**Six readability formulas.** Flesch Reading Ease, Flesch-Kincaid Grade,
Gunning Fog, SMOG, Coleman-Liau and Automated Readability, plus a consensus
grade, audience note and reading time.

**Six tone signals.** Formality, confidence, sentiment, subjectivity,
personal voice and passive-voice share -- each with the evidence that produced
it, so a score is never just a number.

**Full traceability.** Every edit records the rule that made it, the reason,
and the exact before/after text. The "Why" tab shows the plan the engine
followed, the passes it ran, and each individual edit.

**Summarize, not just rewrite.** Extractive summarisation at three lengths:
sentences are scored on shared vocabulary, position, names and figures, and
length; the best are kept verbatim in their original order, near-duplicates
dropped. Nothing is invented, because an engine with no language model has no
business writing new sentences. The trace explains every sentence it kept and
every one it cut, with the score. The chosen tone is then applied to what
survived, so a summary can also be made concise or formal.

**Offline first.** Rewriting, metrics and exports run in the page. A service
worker caches the shell, so a reload works with the network down; runs are
mirrored to `localStorage` and stored on the server whenever it is reachable.

**History and versioning.** Runs are saved with their metrics and trace.
Re-running a stored text creates a child version, so you can compare
alternatives. Export any run as Markdown, JSON or plain text.

---

## How the engine works

The pipeline is ordinary NLP, not a model:

1. **Plan** -- the tone preset and reading-level target combine into a plan:
   goals, target register, target grade, sentence-length target.
2. **Lexical rules** -- 90 phrase rewrites (wordiness, filler, empty openers,
   nominalizations), contraction policy, register vocabulary, intensifier and
   hedging policy, then sense-scoped synonym selection.
3. **Structural rules** -- passive-to-active conversion, sentence splitting
   and joining.
4. **Measure and correct** -- the output is re-scored; if it misses the grade
   target the plan tightens and the text goes through again (max 3 passes).

Summarising runs before that pipeline: sentences are scored, the best kept in
document order, then the surviving text goes through the rewrite stages
above. One trace covers both phases.

Design decisions worth knowing:

- **Synonyms are sense-scoped and register-graded.** Each entry carries a
  register (-2 slang to +2 academic) and an approximate reading grade, so the
  same lexicon serves "simplify" and "formalize" by moving in opposite
  directions. Replacements are re-inflected to match the original
  ("utilized" becomes "used", not "use").
- **Grade cost is asymmetric.** A word above the target reading grade hurts
  the reader; a word below it does not. This is why a Casual rewrite does not
  reach for the fancier synonym just because it sits nearer the target.
- **The engine refuses rather than invents.** An agentless passive ("The
  report was filed") is left alone, because promoting a subject that is not
  in the sentence would fabricate content. Swaps that would drift in meaning
  are omitted from the lexicon rather than shipped as near-misses.
- **Determinism.** The seed is derived from the input and options, so results
  are reproducible. "Vary" supplies a new seed for a different-but-stable
  alternative.

The engine lives in its own workspace package, `@humaninzer/engine`, with no
Node built-ins and no third-party dependencies -- a property enforced by test,
because it is what lets the identical code run in the browser and on the
server. Inside it, the pipeline sits behind an adapter
(`engine/src/engines/index.js`): a second backend, a local ONNX model for
instance, can be registered against the same contract without touching the
routes.

### Where work happens

The browser computes; the server stores. The client bundles the engine, so a
rewrite never waits on a request, and `POST /api/runs` takes the finished
result rather than asking the server to redo it. If the server is unreachable
the run still completes and is kept in `localStorage`, and the header says so.
`POST /api/paraphrase` remains available for API clients that would rather the
server do the work.

---

## API

Base URL `http://localhost:4000/api`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Status, persistence mode, engine list |
| `GET` | `/presets` | Tones, reading targets, intensities, limits |
| `POST` | `/paraphrase` | Rewrite text; returns output, metrics, diff, trace |
| `POST` | `/summarize` | Shorten text; same shapes as `/paraphrase` |
| `POST` | `/analyze` | Metrics only, no rewriting |
| `POST` | `/export` | Format an unsaved run as `md`, `json` or `txt` |
| `POST` | `/runs` | Store a run computed in the browser |
| `GET` | `/runs` | History list (`limit`, `skip`, `favorite`, `search`) |
| `GET` | `/runs/:id` | One run in full, plus its version chain |
| `PATCH` | `/runs/:id` | Rename or favorite |
| `DELETE` | `/runs/:id` | Delete a run and its versions |
| `GET` | `/runs/:id/export?format=` | Download a stored run |

### `POST /paraphrase`

```jsonc
{
  "text": "It should be noted that the results were reviewed by the board.",
  "tone": "concise",              // neutral | formal | casual | concise | persuasive | academic | friendly
  "readabilityTarget": "auto",    // auto | simple | standard | professional | advanced
  "intensity": "balanced",        // light | balanced | strong
  "mode": "rewrite",              // rewrite | summarize
  "summaryLength": "standard",    // brief | standard | detailed (summarize only)
  "preserve": ["Kubernetes"],     // words the engine must not touch
  "seed": 12345,                  // optional; omit for a deterministic default
  "persist": true,
  "title": "Board note",
  "parentId": null                // set to create a new version of a run
}
```

Response (abridged):

```jsonc
{
  "original": "...",
  "paraphrased": "The board reviewed the results.",
  "metrics": {
    "before": { "readability": { "scores": {...}, "summary": {...} }, "tone": {...} },
    "after":  { "readability": {...}, "tone": {...} },
    "delta":  { "readability": {...}, "tone": {...}, "counts": {...} }
  },
  "diff":  { "segments": [{ "type": "remove", "text": "were reviewed by" }], "stats": {...} },
  "trace": [{ "rule": "voice", "reason": "Passive rewritten as active", "from": "...", "to": "..." }],
  "plan":  { "toneLabel": "Concise", "targetGrade": 8.2, "goals": ["concise", "direct"] },
  "passes": [{ "pass": 0, "edits": 4, "grade": 6.5 }],
  "seed": 2839684154,
  "persisted": true,
  "id": "6a86d8401e8618a57d599bba"
}
```

Errors are JSON. Validation failures return `400` with a per-field `issues`
array; history endpoints return `503` with a reason when no database is
connected, which is the client's signal to fall back to local history.

---

## Data model

Two stores holding the same shape. The browser keeps complete runs in
IndexedDB (`humaninzer` database, `runs` object store, capped at 200 entries,
oldest pruned first). When server persistence is enabled, one MongoDB
collection mirrors it:

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | Derived from the first line when not supplied |
| `contentOriginal` | string | Input text |
| `contentParaphrased` | string | Output text |
| `options` | object | `tone`, `readabilityTarget`, `intensity`, `engine`, `seed`, `preserve` |
| `metrics` | object | Full before/after/delta snapshots, stored verbatim |
| `trace` | array | Per-edit records (capped at 500) |
| `traceSummary` | array | Edit counts per rule, with examples |
| `plan`, `passes` | object/array | What the engine decided and how it converged |
| `favorite` | boolean | |
| `parentId`, `version` | ObjectId, number | Version chain by parent pointer |
| `createdAt`, `updatedAt` | date | |

Metrics are stored as they were computed, so an old run always renders
exactly as it did when created, even if the scoring code later changes.

---

## Project layout

```
engine/src/           @humaninzer/engine - shared, dependency-free
  nlp/                tokenize, syllables, readability, tone, morphology, pos
  data/               phrase rules, synonym sets, tone presets, markers
  engines/            adapter registry
    rules/            the pipeline: plan, lexical rules, structural rules
  lib/                diff, metrics assembly, exporters
server/src/
  models/             Run (mongoose)
  routes/             health, presets, paraphrase, runs
  schemas/            zod request validation
  services/           run storage
client/src/
  components/         InputArea, Controls, OutputCard, MetricsDisplay,
                      DiffView, TracePanel, HistoryPanel, CopyButton, ThemeToggle
  lib/                engine wrapper, api client, IndexedDB history, sw registration
client/src/styles/    theme tokens: palette, wobbly radii, hard shadows
client/public/fonts/  Kalam and Patrick Hand, self-hosted
client/public/sw.js   service worker: shell + fonts cached, API never cached
```

## Look

The interface is drawn rather than designed: warm paper with a grain, felt-tip
headings (Kalam), handwritten body text (Patrick Hand), wobbly eight-value
border radii, hard offset shadows with no blur, and a static tilt on every
card so nothing sits square.

Seven colours, no gradients: paper, white, soft-pencil ink (never `#000`),
erased-pencil grey, marker red, ballpoint blue, and post-it yellow. Everything
lives as tokens in `client/src/styles/index.css`; components reference
`var(--marker)` and `.sketch-btn`, never a literal.

Repeated items vary deterministically by index (`client/src/lib/sketch.js`) --
five radii and seven rotations on coprime cycles, so a list runs to 35 items
before a pair repeats, and nothing twitches between renders the way
`Math.random()` in render would.

The fonts are self-hosted (80 KB, Latin + Latin-Extended). Loading them from
a CDN would have meant the handwriting disappears exactly when the app is
offline, which is the case it is built for.

There is no dark mode: the palette is a single paper theme by design.

## Accessibility

Semantic landmarks and a skip link; a real tablist with arrow-key navigation;
radio groups for tone; ballpoint-blue focus rings on everything focusable;
`role="meter"` on metric bars with `aria-valuenow`; live-region announcements on
copy; 48px minimum touch targets; decorative marks are `aria-hidden`;
`prefers-reduced-motion` drops the jiggle and the bob.

Colour is never the only signal. The palette has no green, so the diff marks
insertions in ballpoint blue and corrections with a marker-red rule through
ink-weight text -- the strikethrough and underline carry the same meaning
without it. Contrast was measured rather than assumed: ink on paper is
13.3:1, ballpoint on paper 6.4:1, and muted ink 5.2:1. White on marker red is
3.3:1, which is why every element using that fill is 20px bold Kalam, over
the large-text threshold where 3.0:1 is the bar.

One deliberate exception: placeholders sit at 40% ink (2.3:1) because the
style calls for them faint. They restate instructions available elsewhere on
the page rather than carrying unique content. Raising `--ink-faint` to 70%
in `client/src/styles/index.css` fixes it if you would rather have the
contrast.

## Testing

```bash
npm test              # 55 server and engine tests
npm run test:offline  # engine parity, summarising, history, cold start with no network
npm run test:render   # headless render check (API must be running)
npm run test:storage  # opt-in: 6 storage tests against an embedded MongoDB
```

`npm test` skips the storage suite, because running it downloads a MongoDB
binary and the app does not need one. `npm run test:storage` opts in; so does
setting `MONGODB_URI` to a database you already run.

Coverage: sentence segmentation and offsets, syllable counting against a
reference table, all six readability formulas, tone scoring, morphology,
POS tagging, engine determinism, per-tone behaviour, grade targeting, voice
conversion including phrasal passives and the refusal case, preserved words,
trace completeness, paragraph preservation, the diff, engine portability
(no platform or third-party imports), every API endpoint including its error
and no-database paths, and an opt-in storage suite against a real embedded
MongoDB covering versioning, search, export and cascade delete.

## Limits

History is per browser profile by default: clearing site data clears it, and
another browser sees an empty list. That is the trade for needing no database
-- turn on `PERSISTENCE` if it matters.



Rule-based rewriting reorganizes what is there; it does not rephrase from
meaning. Long, tangled sentences are split at coordinators or left alone.
Grade targets converge to roughly +/-1.5 grades, and far-apart targets on
short inputs may not fully converge. The synonym lexicon covers 64
senses across 275 words -- broad enough to shift register noticeably, not a thesaurus.
