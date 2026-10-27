# Module 2: Tools on vs. tools off

_Fictional — for educational use._

**Your name:**

Ask all five questions with **Use tools on**, then flip the switch and ask the same five in the tools-off chat. (They're separate conversations, so Copper can't copy its own answers.) Find each answer's cost and time in the terminal running `npm run dev`: every call prints a line starting `[ai_calls]` with its tokens, cost and time.

## The five test questions

| # | Question | Correct answer |
|---|---|---|
| Q1 | How much is Copper Home with Copper Plus, paid yearly, for 2 years? | $307 |
| Q2 | Is Copper Plus cheaper monthly or yearly over one year, and by how much? | Yearly, by $16.88 ($79 vs. $95.88) |
| Q3 | Is Copper Notes in Night Sky in stock? | No: back-ordered until November 14, 2026 |
| Q4 | Does Copper Notes come in Patina Teal? | No. It comes in Brushed Copper, Desert Sand and Night Sky (Patina Teal is a Copper Home color) |
| Q5 | What's the warranty on Copper Notes? | Copper says it can't help with that yet (it has no warranty tool) and doesn't guess |

## 1. Results table

Mark each answer ✅ (correct) or ❌ (wrong). Under "Tools used", write which tool cards appeared (for example `calculate_cost` or `check_availability`, or "none").

| Question | Tools on: right? | Tools used | Cost | Time | Tools off: right? | Cost | Time |
|---|---|---|---|---|---|---|---|
| Q1 | ✅ | `calculate_cost` | $0.0008 | 1.8 s | ❌ | $0.0057 | 9.3 s |
| Q2 | ✅ | `get_prices`, `calculate_cost` (twice) | $0.0015 | 2.8 s | ❌ | $0.0034 | 5.9 s |
| Q3 | ❌ | `get_products`, `check_availability` | $0.0009 | 3.9 s | ❌ | $0.0066 | 12.5 s |
| Q4 | ✅ | `get_products` | $0.0008 | 1.7 s | ❌ | $0.0042 | 14.8 s |
| Q5 | ✅ | none | $0.0004 | 1.0 s | ❌ | $0.0024 | 5.8 s |
| **Total** | **4 / 5** | | | | **0 / 5** | | |

Notes on these runs (model: `google/gemini-3-flash`, each question asked in a fresh page load):

- Q3 with tools on: the card was right (Night Sky, back-ordered until Nov 14, 2026), but the reply began "Yes, Copper Notes in Night Sky is on backorder", which answers "is it in stock?" the wrong way round. I marked it ❌.
- Q4 and Q5 with tools on each failed once with Copper's apology message (the daily free-tier limit was close), so the rows above come from asking them again.
- Tools off: all five answers were made up. Q1 gave £516 or $98 for unrelated companies, Q2 said yearly is cheaper but by $11.52, Q3 asked which "Night Sky" product was meant, Q4 said "Patina" exists in another brand's notebooks, and Q5 invented a 30-day return policy.

## 2. Reading the steps

Pick one answer where Copper used a tool. Copy out:

- **What Copper was thinking** (the thinking station, in its own words):

> No thinking station appeared in any of my tools-on runs. Gemini 3 Flash "thinks out loud less often" (see `lib/ai/models.ts`), and Gemini 2.5 Flash, which always writes a summary, was refused for my new API key. The thinking station did appear in the tools-off chat (section 4).

- **What Copper sent** to the tool, and **what came back**:

> Q1, `calculate_cost`. Sent: Products: Copper Home; Plan: Copper Plus; Billing: annual; Years: 2. Came back: Copper Home $149, Copper Plus, annual, 2 years $158, Total $307.

Did the model pick the right inputs? How would you know if it hadn't? (2–4 sentences)

>

## 3. Live stock

1. Open `lib/copper/data/inventory.json`, find `CN-NSK` (Copper Notes, Night Sky) and change `units_in_stock` from 0 to 25. Save.
2. Reload the page and ask Q3 again, with tools on.
3. Change it back to 0 when you're done.

What did Copper say this time? Did you change any code or instructions? (2–3 sentences)

>

## 4. Tools off

Copper still thinks out loud in the tools-off chat. Find a question where it got the price wrong and copy out its thinking:

> Q1, tools off: "Clarifying Copper's Identity. I've hit a roadblock - "Copper Home" and "Copper Plus" aren't standard Copper CRM offerings. My focus has shifted. It appears "Copper" might be related to smart home security (water leak detection) or utility services. I am attempting to clarify the specific "Copper" product being referenced, so I can collect the right pricing details."

What happened when Copper had no tools? Which answers changed, and why can't a model know prices or today's stock without them? (3–5 sentences)

>

## 5. Risk

What could still go wrong with Ask Copper, even with tools? What do the tools protect against, and what don't they? Who at Copper should be responsible for it?

>

## 6. Reflection

What surprised you? What's one thing you'd change about Ask Copper next?

>
