# OutingMate — AI-Powered Group Outing Planner

OutingMate turns unstructured group conversations into actionable, collaborative outing plans. Import a WhatsApp chat export (.txt or .zip), and OutingMate analyzes messages, timestamps, links, and media to extract destinations, dates, budgets, member preferences, open questions, and tasks.

> **Import → Understand → Extract → Plan → Collaborate → Execute**

---

## 🌟 Key Features

1. **WhatsApp Chat & Media Import**
   - High-fidelity parser supporting Android (12h / 24h) and iOS bracket timestamp formats.
   - Multiline message support, system message classification, media-omitted and attachment file extraction.
   - SSRF-protected link extraction (blocks loopback, RFC 1918 private ranges, and cloud metadata endpoints).
   - ZIP bomb and path-traversal protection.

2. **Gemini AI Intelligence & Extraction**
   - Structured JSON output with strict Zod schema validation.
   - Distinguishes fact status: `confirmed`, `proposed`, `inferred`, `conflicting`, and `unknown`.
   - Preserves source message references (`[msg_12 by Priya]`) for end-to-end traceability.
   - Detects conflicts, open questions, and suggested action items.

3. **Editable Outing Plan Generation**
   - Generates day-by-day itineraries, per-person budget estimates, transport modes, and preparation checklists.
   - AI section regeneration (e.g. regenerate itinerary or budget adjustments).
   - Human-in-the-loop review and confirmation.

4. **Sarvam Voice AI Assistant**
   - Speech-to-Text (STT) voice notes via microphone using MediaRecorder API and Sarvam STT.
   - Text-to-Speech (TTS) audio answers via Sarvam TTS with browser speech fallback.
   - Answers questions strictly cited from conversation facts and current plan status.

5. **Collaboration & Decision Center**
   - Shareable workspace invitations.
   - Interactive group polls & voting with real-time percentages.
   - Shared group expense tracker with equal splitting.
   - Task management and group notes.

6. **Flagsmith Feature Flags & Experiments**
   - Gradual rollout and A/B testing support for chat import, voice assistant, and plan generation prompts.

---

## 🏗️ Architecture & Monorepo Structure

```text
myouting/
├── apps/
│   ├── web/                    # Vue 3 + TypeScript + Vite + Tailwind CSS + Pinia
│   │   ├── src/
│   │   │   ├── components/     # Navbar, modals, widgets
│   │   │   ├── views/          # Auth, Dashboard, Create, Import, Insights, Plan, Assistant, Collaboration, Settings
│   │   │   ├── stores/         # Pinia auth & workspace state
│   │   │   ├── services/       # Typed API client
│   │   │   └── types/          # Frontend data models
│   │   └── package.json
│   └── api/                    # Node.js + TypeScript + Express + Vitest
│       ├── src/
│       │   ├── modules/
│       │   │   ├── chat-parser/# Android/iOS WhatsApp parser, SSRF protector, ZIP extractor
│       │   │   ├── users/      # User profile endpoints
│       │   │   ├── workspaces/ # Outings & invitation management
│       │   │   ├── imports/    # Chat import upload & parsing
│       │   │   ├── insights/   # Extracted facts & human review
│       │   │   ├── plans/      # Plan generation & section regeneration
│       │   │   ├── assistant/  # Contextual AI chat with citations
│       │   │   ├── speech/     # Sarvam STT / TTS integration
│       │   │   ├── collaboration/# Polls, tasks, expenses, comments
│       │   │   └── flags/      # Flagsmith feature flags
│       │   ├── providers/      # Gemini AI, Sarvam Speech, Flagsmith providers
│       │   ├── middleware/     # Authentication & workspace RBAC
│       │   ├── schemas/        # Zod validation schemas
│       │   ├── services/       # DataStore (Firestore & mock store)
│       │   ├── utils/          # Logger & error handler
│       │   ├── app.ts          # Express application setup
│       │   └── server.ts       # Server entrypoint
│       └── package.json
├── fixtures/                   # Sample WhatsApp chat exports for testing
├── OutingMate_spec.md          # Product & Technical Specification
├── .env.example                # Unified environment variables template
├── package.json                # Root monorepo workspace configuration
└── README.md
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js >= 18.0.0 (Tested on Node.js v25)
- npm >= 9.0.0

### 2. Installation
```bash
# Install dependencies across all workspaces
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `apps/api/.env` and `apps/web/.env` if you have API keys:
```bash
cp .env.example apps/api/.env
```
> **Note:** OutingMate works **out of the box** even without external API keys! An intelligent built-in fallback provider runs the full workflow, and automatically activates live Gemini and Sarvam when `GEMINI_API_KEY` and `SARVAM_API_KEY` are provided.

### 4. Running the Development Servers
In two terminal tabs:

**Backend API:**
```bash
npm run dev:api
# API starts at http://localhost:3000 (Health check: http://localhost:3000/health)
```

**Frontend Web App:**
```bash
npm run dev:web
# Web app starts at http://localhost:5173
```

---

## 🧪 Testing & Verification

Run the test suite:
```bash
npm test --workspace=apps/api
```

This validates:
- WhatsApp Android (12h / 24h) and iOS bracket timestamp parsing
- Multiline message continuations
- Media omitted & file attachment detection
- SSRF link protection against private IPs, localhost, and cloud metadata
- End-to-end vertical slice from WhatsApp TXT to Extracted Facts, Generated Plan, AI Assistant, and Polling!

### Production Build
```bash
npm run build
```
Builds both the frontend static bundle via Vite and the backend TypeScript application via `tsc`.

---

## 🔒 Security & Privacy Highlights

- **Consent Enforcement**: Mandates explicit confirmation before parsing exported chats.
- **SSRF Protection**: Prevents attacks via shared links by blocking localhost, RFC 1918 private subnets, and cloud metadata (`169.254.169.254`, `metadata.google.internal`).
- **Archive Safety**: Defends against ZIP bombs (100MB limit) and path traversal (`..` attacks).
- **Prompt Injection Defense**: Treats all imported messages as untrusted user data.
- **Data Lifecycle**: Clear and delete imported chats and derived data at any time.

---

## 📜 License
MIT
