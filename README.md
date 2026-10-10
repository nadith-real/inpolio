# Inpolio

Local-first business OS for small and medium companies.

Inpolio runs entirely on your computer. There is no account, no cloud database and no telemetry. Open it in a browser on localhost and keep customers, sales, invoices, inventory and tasks in one place.

```
┌────────────────────────────┐
│          INPOLIO           │
│  Your business. One place. │
└────────────────────────────┘
```

## Features

- Dashboard with live revenue, profit, outstanding invoices and alerts
- Customers / CRM with statuses, tags and a sales pipeline
- Orders that update inventory when completed
- Invoices with print/PDF via the browser, duplicate and overdue tracking
- Payments (cash, bank transfer, card, other) — no payment gateways
- Inventory, suppliers, appointments, tasks
- Local WHEN → THEN automations
- Analytics from stored data only
- Offline business assistant (deterministic answers from local records)
- Global search (`Ctrl + K`) and local notifications
- Export / import JSON backups and optional labelled demo data

## Requirements

- [Node.js 20](https://nodejs.org/) or later (includes `npm`)
- A modern browser (Firefox, Chrome, Edge, or Safari)
- Git (only if you install from GitHub)

No Docker, no database server, and no internet connection after install.

## Installation for public users

### 1. Install Node.js

Download Node.js 20 LTS or newer from https://nodejs.org/ and confirm:

```bash
node -v
npm -v
```

You should see `v20` or higher.

### 2. Get the source

```bash
git clone https://github.com/<your-org>/inpolio.git
cd inpolio
```

If you downloaded a ZIP from GitHub, unzip it and open that folder in a terminal.

### 3. Install dependencies

```bash
npm install
```

### 4. Start Inpolio

**Recommended (production build + local server):**

```bash
npm run build
npx inpolio
```

The CLI prints the local URL and opens your browser when possible:

```
┌────────────────────────────┐
│          INPOLIO           │
│  Your business. One place. │
└────────────────────────────┘

✓ Local server started
→ http://localhost:4173

Press Ctrl+C to stop.
```

**Development mode** (hot reload, no production build):

```bash
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

**Preview an existing build:**

```bash
npm run build
npm run preview
```

### 5. Optional global command

After `npm install` in the project folder:

```bash
npm link
inpolio
```

`inpolio` serves `dist/` when a build exists; otherwise it starts the Vite dev server.

### Environment variables

| Variable | Meaning |
| --- | --- |
| `PORT` | Server port (default `4173`) |
| `HOST` | Bind host printed in the URL (default `localhost`) |
| `INPOLIO_NO_OPEN=1` | Do not open a browser |

Example:

```bash
PORT=8080 INPOLIO_NO_OPEN=1 npx inpolio
```

## First-time usage

1. Open **Settings** and enter your business name, currency (default **LKR**) and tax rate.
2. Optionally load **demo data** to explore the workspace. Demo rows are labelled and can be removed.
3. Add products, then customers, then orders.
4. Completing an order deducts stock.
5. Create an invoice and record payments. Invoice status updates automatically.
6. Use **Dashboard** and **Analytics** for live figures. Nothing is invented.

## Data and storage

All records live in this browser's `localStorage` under `inpolio.data.v1`.

- Data stays on the machine and browser you used.
- Changing browsers, devices, or clearing site data will not carry records over.
- Storage is wrapped in `src/lib/storage/` so IndexedDB or a local database can replace it later. Components never call `localStorage` directly.

### Backup and restore

- **Export JSON** — Settings → Data → Export JSON
- **Import JSON** — Settings → Data → Import JSON (replaces the current workspace after validation)
- **Clear data** — removes business records, keeps settings
- **Reset** — restores empty defaults

Invalid JSON, unknown shapes, duplicate IDs and missing fields are normalised or rejected instead of crashing.

Export regularly. Clearing site data in the browser also deletes Inpolio records.

## Updating

```bash
cd inpolio
git pull
npm install
npm run build
npx inpolio
```

Export JSON from Settings before updating if you want an extra backup.

## Troubleshooting

**`node` / `npm` not found**  
Install Node.js 20+ and reopen the terminal.

**`npx inpolio` fails with Vite not installed**  
Run `npm install` in the project root first.

**Port already in use**  
```bash
PORT=4174 npx inpolio
```

**Blank page or old UI**  
Rebuild, then start again:

```bash
npm run build
npx inpolio
```

**Data disappeared**  
Inpolio stores data in the browser, not on the Node server. Use the same browser profile, or restore from a JSON export.

**`Ctrl + K` search does nothing**  
Click inside the app first so the window has keyboard focus.

## Architecture

```
src/
  components/     UI primitives, layout, shared widgets
  pages/          Route screens
  lib/
    storage/      Adapter + repository (localStorage today)
    analytics/    Derived metrics
    automation/   WHEN → THEN engine
    assistant/    AIProvider + local data answers
    export/       Backup/restore
  hooks/
  types/
cli/              Local `inpolio` command
```

Business rules (inventory deduction, invoice status, customer spend) live in `src/lib/business.ts`, not in React components.

The assistant uses an `AIProvider` interface. The bundled provider answers stock, debt, sales and task questions from stored data. A local model can implement the same interface later. OpenAI, Anthropic and Google APIs are not used.

## License

MIT. See `LICENSE`.

## Contributing

Issues and pull requests are welcome.

- Keep the app local-first. Do not add required cloud services.
- Prefer free/open-source dependencies.
- Do not scatter storage calls in components.
- Preserve accessible forms, labels and keyboard navigation.
- Demo data must stay optional and labelled.
