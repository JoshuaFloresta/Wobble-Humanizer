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
