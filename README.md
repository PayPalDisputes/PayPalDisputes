# Sira

**Your disputes, settled in seconds.** Sira is an AI dispute desk for PayPal sellers.

Built for the PayPal AI Hackathon by Senadhi Bulankulame and Arjun Singh.

**Try it:** [paypal-disputes-one.vercel.app](https://paypal-disputes-one.vercel.app). Click **Try the demo**. No sign-up is needed, and nothing is sent to PayPal in demo mode. The demo uses sample stores and sample data.

## What Sira does

Small sellers often lose time and money on disputes because they have to learn the rules and gather the evidence by themselves. When a dispute arrives, Sira:

1. **Investigates** the case using the dispute, the transaction and the store's shipping records.
2. **Recommends** whether to fight, settle or refund, and explains why.
3. **Drafts the response**, with a PDF evidence pack ready to attach.
4. **Waits for the seller.** Nothing reaches PayPal until they click Approve, unless they have turned on an automatic rule.

Sellers can also:

- Ask Sira questions about a case and have it revise the draft
- Use Insights to track time saved, money kept and how often Sira's advice held up
- See why disputes keep happening, such as weak shipping proof
- Turn on automatic rules, such as refunding disputes under a limit they choose. These are off by default and run on fixed checks, not the AI's judgment.

## How it works

```text
PayPal disputes  ->  Sync and webhooks  ->  Supabase
                                              |
                                              v
                     AI agent + PayPal Agent Toolkit (read-only)
                     + store shipping records
                                              |
                                              v
                     Hard rules and settlement formula, in code
                                              |
                                              v
                     Seller reviews and approves  ->  PayPal
```

The AI handles investigation, judgment and writing. Facts, money and safety rules stay in code:

- **Read-only agent:** the agent can look things up through the PayPal Agent Toolkit, but it has no tools that write to PayPal.
- **Hard rules:** answers are checked against rules, such as never accepting a claim that was already refunded. If an answer breaks a rule, the model gets one chance to fix it.
- **Settlement formula:** offers are worked out in `src/lib/settlement.ts`, not by the model.
- **Demo mode:** only `PAYPAL_ACTIONS_MODE=live` sends anything. Any other value runs the checks but sends nothing and saves nothing.
- **Evals:** `evals/cases.ts` holds test disputes with known right answers, so prompt changes can be measured.

The webhook endpoint verifies PayPal's signature on every event. The sandbox doesn't send dispute events, so a scheduled sync brings disputes in during testing.

## Built with

- **Next.js, React and TypeScript**
- **Tailwind CSS, AG Grid and AG Charts**
- **Supabase (PostgreSQL)**
- **OpenAI API**
- **PayPal:** Disputes API, Agent Toolkit, Webhooks, Transaction Search, Shipment Tracking and Log in with PayPal
- **Vercel**

## Run it locally

The live demo is the easiest way to try Sira. Running it yourself needs your own PayPal sandbox app, Supabase project and OpenAI API key.

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`, then start the app:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

> **Database note:** the SQL files in `supabase/` add the orders, evals and chat tables and update `decisions`. The base tables, such as `disputes`, `decisions` and `sellers`, were created in our Supabase project and aren't in this repo yet.

### Useful commands

| Command | What it does |
|---|---|
| `npm run sync` | Pulls disputes from PayPal |
| `npm run seed:orders` | Adds sample shipping records for disputes in the database |
| `npm run seed:history` | Adds sample resolved disputes for Insights |
| `npm run eval:seed` | Copies the eval cases into the database |
| `npm run eval` | Scores the agent against the eval cases |

## Project layout

| Path | Contents |
|---|---|
| `src/app` | Pages and API routes |
| `src/lib/agent.ts` | The dispute agent and its hard rules |
| `src/lib/investigate.ts` | The agent's read-only tools |
| `src/lib/settlement.ts` | The settlement formula |
| `src/lib/respond.ts` | Sending approved responses to PayPal |
| `src/lib/outcomes.ts` | Tracking how disputes ended |
| `evals/cases.ts` | The eval set |
| `supabase` | Database scripts |
