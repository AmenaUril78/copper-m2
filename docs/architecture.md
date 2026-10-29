# Architecture

How the Copper State Labs app fits together. Each module adds a section at the
end (see [Adding a module](#adding-a-module)) when it changes how the app
works: new pages, tables or AI calls.

_Fictional — for educational use._

## The starter app (Module 0)

A Next.js app that builds, runs and deploys with **no environment variables**.
A Google AI Studio key is optional until a module needs one.

| Piece | Where | What it does |
|---|---|---|
| Pages | `app/` | `layout.tsx` sets the fonts and theme; `page.tsx` is the placeholder home page |
| Brand components | `components/copper/` | `Logo`, `SiteHeader`, `SiteFooter`, `ModeToggle` |
| UI kit | `components/ui/` (shadcn), `components/ai-elements/` (AI Elements) | The only UI libraries the app uses |
| Setup card | `components/setup-required.tsx` | `<SetupRequired service="ai" />`, shown instead of a page whose service isn't configured |
| Company catalog | `lib/copper/catalog.ts`, `lib/copper/data/catalog.json` | Product, plan and privacy facts from the Product Bible (Sections 3, 4, 8 and 10). Pages read prices and plan details from here instead of typing them (added in the Module 1 starter) |
| AI wrapper | `lib/ai/call.ts` | `callText` and `callObject`: every model call goes through these and is logged to the terminal |
| Models and prices | `lib/ai/models.ts`, `lib/ai/pricing.ts` | The approved Gemini models and their token prices |
| Module checks | `specs/module-N/`, `scripts/check.mjs` | Each module's spec, instructions, rubric and acceptance tests; `npm run check` runs them |

## Data flow

1. A user opens a page in `app/`.
2. Server code checks what's configured (`isAiConfigured()`). If the key is
   missing, the page renders `<SetupRequired />` instead of crashing.
3. Data comes from files under `lib/copper/data/`, except where a module has
   moved it to a database: Module 2 part 2 moves stock to a Supabase
   `inventory` table, read through `lib/copper/inventory.ts`. Facts that don't
   change daily (prices, colors) stay in the files.
4. AI requests go through `callText` / `callObject` in `lib/ai/call.ts`, which
   calls Google and then prints one `[ai_calls]` line: `module`, `feature`,
   `model`, tokens, `cost_usd`, `latency_ms`, `ok`.

```ts
const { text } = await callText(
  { module: 2, feature: "ask-copper" },
  { prompt },
);
```

## Two kinds of "AI tiers"

Don't mix these up:

- **Copper State Labs' product tiers** (On-device, Raw Ore, Refined, the
  Copper Cloud) are part of the fictional company. They are facts in the
  [Product Bible](copper-state-labs/product-bible.md) and rows in the `ai_tiers`
  table.
- **The models this app calls** are real Claude models listed in
  `lib/ai/models.ts`. Their cost is logged in `ai_calls`.

## Decisions

- **No environment variables required.** Every service is optional, so a fresh
  clone builds and deploys before any accounts are set up.
- **One AI wrapper.** Routing every call through `lib/ai/call.ts` gives one
  place to log cost and latency per module and feature.
- **No authentication or row-level security yet.** They arrive in a later
  module.

## Module 2: Ask Copper tools

**Summary:** the four tools the shopping chatbot can call, so prices, totals
and stock come from code and data instead of the model's memory.

| Piece | Where | What it does |
|---|---|---|
| Tools | `lib/copper/assistant/tools.ts` | `get_products`, `get_prices`, `calculate_cost`, `check_availability`, exported as `copperTools` |
| Data | `lib/copper/catalog.ts`, `lib/copper/inventory.ts` | Prices and colors from the catalog; stock read fresh by `readInventory()` |

**Data flow:** model picks a tool and writes its input → zod schema validates
it → ordinary TypeScript reads the catalog or stock list → result goes back to
the model.

**Decisions and trade-offs:** input schemas are strict (unknown fields,
6 years or 1.5 years are rejected) so the app, not the model, protects the
business. Each line is rounded to cents before summing. Stock is never cached.
`not_a_color` is decided before stock is read, so it holds when stock is down.

**Risks and open questions:** the tools only read, so they can't change
anything. A blank `color` is treated as "every color".

### Ask Copper: the action and the panel

| Piece | Where | What it does |
|---|---|---|
| Server Action | `lib/copper/assistant/ask.ts` | `askCopper({ messages, useTools })` validates the request, returns `{ progress }` at once and reads the model stream in the background |
| Panel | `components/copper/ask-copper.tsx` | Floating launcher and Sheet; two separate chats (tools on / off); starter questions; shows `<SetupRequired />` without a key |
| Stations | `components/copper/ask-copper-stations.tsx` | Draws one answer: tools on offer, thinking, tool calls, "what's happening now" |
| Tool card | `components/copper/ask-copper-tool-card.tsx` | One tool call, always open: what Copper sent, what came back |
| Page / header | `app/page.tsx`, `components/copper/site-header.tsx` | Mounts the panel (with `isAiConfigured()`) and links to `#ask` |
| AI calls | `lib/ai/call.ts` (module 2, feature `ask-copper`) | `callStream` with `THOUGHT_SUMMARIES`; tools on adds instructions, the four tools and `stepCountIs(5)` |

**Data flow:** shopper question → panel (that chat's finished turns plus the
question) → `askCopper` → `callStream` → model → tool calls run in
`tools.ts` → each stream part updates a `Progress` → fresh copies go out through
a live value → `readLive()` in the panel redraws.

**Decisions and trade-offs:** a live value (not an API route) keeps the site to
one page. Each update is a full copy, so a missed update loses nothing. The
request is checked with zod (shape and size) because a Server Action is a public
POST endpoint. With tools off the model gets no instructions at all, so the
comparison shows what it does when nothing tells it to check.

**Risks and open questions:** cost per question is logged to `ai_calls`. The
default model is set in `lib/ai/models.ts` and can be changed with `AI_MODEL`.

## Adding a module

When a module changes how the app fits together, add a section here:

```md
## Module N: <feature name>

**Summary:** one or two sentences: what this adds and why.

| Piece | Where | What it does |
|---|---|---|
| Page / route | `app/...` | |
| Components | `components/...` | |
| Data | `lib/copper/data/...` | Data files added |
| AI calls | `lib/ai/call.ts` (module, feature) | Model, prompt purpose, expected cost per call |

**Data flow:** user action → page → server code → database / model → response.

**Decisions and trade-offs:** what you chose, the alternatives, and why.

**Risks and open questions:** cost, privacy, accuracy or safety risks, and how
you handle them.
```
