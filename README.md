# IMHAS — Intelligent Multi-Agent Hospital AI System

> **A full-stack, multi-agent hospital management system with RAG-based diagnostics, explainable AI confidence scoring, human-in-the-loop audit trail, real-time anomaly detection, and intelligent billing.**

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Upstash_Redis-7.x-red.svg)](https://upstash.com/)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-orange.svg)](https://ai.google.dev/)

---

## Table of Contents

- [What is Novel](#what-is-novel)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [API Reference](#api-reference)
- [Agents](#agents)
- [UI Pages](#ui-pages)
- [Roadmap](#roadmap)
- [License](#license)

---

## What is Novel

These are the academic contributions that differentiate IMHAS from a standard hospital management system:

### 1. Federated Patient Timeline
Every multi-agent action on a patient is surfaced in a single chronological timeline — Registration → Document Upload → RAG Indexed → Diagnosis Made → Diagnosis Approved → Bill Generated → Anomaly Detected. This makes the distributed pipeline visible to clinical staff without requiring technical knowledge.

### 2. Explainable AI Confidence Scoring
Diagnostic responses do not just show a confidence percentage. They show:
- Number of evidence chunks retrieved from the RAG index
- Top chunk cosine similarity score
- A grounded excerpt from the highest-ranked chunk

This makes the RAG pipeline interpretable — a key difference from black-box AI responses.

### 3. Human-in-the-Loop (HITL) Audit Trail
Every doctor approval or rejection of an AI diagnosis is stored and queryable. The Security page has a dedicated "HITL Events" filter in the audit log table showing: doctor name, timestamp, the original diagnostic question, and the AI confidence at time of decision. This demonstrates responsible, accountable AI in a clinical context.

### 4. Anomaly Detection Dashboard
The security agent runs 5 detection rules (odd-hour access, rapid record access, brute-force attempts, dangerous operations, suspicious patterns). The Security page visualises:
- Live anomaly feed with severity badges (Low / Medium / High / Critical)
- Detection rules panel with editable thresholds and toggle on/off
- 24-hour threat timeline sparkline chart
- Toast notification on new anomaly
- Unified audit log with filters: All / Normal / Anomaly / HITL Events

### 5. Billing Intelligence Agent
The billing agent uses Gemini to analyse a patient's medical history and generate a realistic itemised invoice: Consultation fee, Diagnostic AI analysis fee, Document processing fee, and Medication costs. It also tracks insurance claim status through a progress stepper (Pending → Submitted → Approved / Rejected) and supports PDF export.

### 6. Multi-Document RAG
Multiple documents per patient (lab reports, prescriptions, discharge summaries) are each independently indexed. The diagnostics agent retrieves chunks across all documents for a patient, allowing cross-document reasoning.

### 7. Real-Time Agent Status Panel
The dashboard polls `/api/health` every 10 seconds and shows per-agent: status (Running / Stopped / Error), jobs processed today, last job timestamp, and BullMQ queue depth. If an agent misses its heartbeat for 30 seconds, it turns red with a "Not responding" badge.

---

## Architecture

```
Browser (React + Vite)
        |
        | REST (JWT)
        v
Express Backend (localhost:5000)
        |
   ┌────┼────┬────────────┬──────────────┐
   v    v    v            v              v
Intake  RAG  Diagnostics  Billing  Security
Agent  Indexer  Agent     Agent     Agent
        |
     BullMQ + Upstash Redis
        |
     MongoDB (hospital-ai)
     Collections: patients, documents, diagnostics,
                  billingproposals, auditlogs, embeddings
```

All agents use BullMQ job queues backed by Upstash Redis. The RAG pipeline uses Gemini `gemini-embedding-001` at 768 dimensions. Generation uses `gemini-2.5-flash`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Icons | lucide-react (no emoji, no other icon libraries) |
| Markdown rendering | react-markdown |
| Charts | recharts (Security sparkline) |
| PDF export | jsPDF / react-to-print |
| Backend | Node.js 20, Express.js |
| Database | MongoDB 7 (Mongoose) |
| Queue | BullMQ + Upstash Redis |
| LLM | Google Gemini 2.5 Flash (`gemini-2.5-flash`) |
| Embeddings | Google Gemini `gemini-embedding-001` (768 dimensions) |
| Auth | JWT, roles: doctor / nurse / admin / receptionist |
| Containerisation | Docker + Docker Compose |

---

## Project Structure

```
IMHAS/
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── DashboardPage.jsx      # Linear-style dashboard, agent status, stat cards
│       │   ├── PatientsPage.jsx       # Full-width patient table, search, pagination
│       │   ├── PatientPage.jsx        # Detail: Overview + Diagnostics + Billing tabs
│       │   ├── SecurityPage.jsx       # Anomaly feed, detection rules, audit log
│       │   ├── SettingsPage.jsx       # Profile, password change, system info
│       │   └── LoginPage.jsx
│       └── components/
│           ├── Sidebar.jsx            # Navy sidebar, Lucide icons, active state
│           ├── Layout.jsx             # Shared wrapper
│           ├── DiagnosticsPanel.jsx   # Chat UI, react-markdown, XAI confidence
│           ├── BillingPanel.jsx       # Itemised invoice, insurance stepper, PDF
│           ├── AuditLogs.jsx          # Filterable audit log table
│           └── IntakeForm.jsx         # Patient registration form
├── backend/
│   └── src/
│       ├── routes/
│       │   ├── patientRoutes.js       # GET /patients, GET /patients/:id/timeline
│       │   ├── healthRoutes.js        # GET /api/health, GET /api/health/system
│       │   ├── billingRoutes.js       # POST /billing/:patientId/generate
│       │   ├── securityRoutes.js      # GET /security/logs, GET /security/alerts
│       │   ├── diagnosticsRoutes.js
│       │   └── intakeRoutes.js
│       ├── controllers/
│       ├── middleware/
│       ├── queues/
│       └── utils/
├── agents/
│   ├── intake-agent/
│   ├── rag-indexer-agent/
│   ├── diagnostics-agent/
│   ├── billing-agent/
│   └── security-agent/
├── shared/
├── docker-compose.yaml
└── README.md
```

---

## Prerequisites

- Node.js 20.x
- MongoDB 7.0 (local) or MongoDB Atlas
- Upstash Redis account (or local Redis 7.x)
- Google Gemini API Key — [get one here](https://ai.google.dev/)
- 4GB RAM minimum

---

## Installation

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/karthicksaai/IMHAS.git
cd IMHAS
cp .env.example .env
# Add your GEMINI_API_KEY, MONGO_URI, UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN
docker-compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Option 2: Manual

```bash
# 1. Backend
cd backend && npm install && npm start

# 2. Agents (each in its own terminal)
cd agents/intake-agent && npm install && npm start
cd agents/rag-indexer-agent && npm install && npm start
cd agents/diagnostics-agent && npm install && npm start
cd agents/billing-agent && npm install && npm start
cd agents/security-agent && npm install && npm start

# 3. Frontend
cd frontend && npm install && npm run dev
```

#### Required `.env` values

```
MONGO_URI=mongodb://127.0.0.1:27017/hospital-ai
UPSTASH_REDIS_URL=https://your-upstash-endpoint
UPSTASH_REDIS_TOKEN=your-token
GEMINI_API_KEY=your-key
JWT_SECRET=your-secret
```

---

## API Reference

### Patients

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/patients` | List all patients |
| GET | `/api/patients/:id` | Single patient |
| GET | `/api/patients/:id/documents` | Documents list |
| POST | `/api/patients/:id/documents` | Upload documents (multi-file) |
| GET | `/api/patients/:id/rag-status` | RAG index status for patient |
| GET | `/api/patients/:id/timeline` | Federated event timeline |

### Health / System

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Agent heartbeat status + queue depth |
| GET | `/api/health/system` | MongoDB, Redis, Gemini API status |

### Diagnostics

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/diagnostics` | Submit diagnostic question |
| GET | `/api/diagnostics/patient/:patientId` | History for patient |
| GET | `/api/diagnostics/:id` | Single diagnostic result |
| PATCH | `/api/diagnostics/:id/review` | Approve / reject (HITL) |

### Billing

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/billing/:patientId/generate` | Trigger billing agent — itemised invoice |
| GET | `/api/billing/:patientId` | Bill history |
| GET | `/api/billing/:id` | Single bill |

### Intake

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/intake` | Register new patient (FormData) |

### Security

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/security/log` | Log access event |
| GET | `/api/security/logs` | Audit logs (filter: all/anomaly/hitl) |
| GET | `/api/security/alerts` | Anomaly events |
| GET | `/api/security/anomalies` | Live anomaly feed with severity |

---

## Agents

### Intake Agent
- **Queue**: `intake`
- Parses uploaded medical documents with Gemini
- Extracts: allergies, medications, conditions, vitals
- Updates patient record in MongoDB
- Enqueues RAG indexing job automatically

### RAG Indexer Agent
- **Queue**: `rag`
- Chunks document text (500 chars, 100 char overlap)
- Generates 768-dim embeddings via `gemini-embedding-001`
- Stores chunks in `embeddings` collection
- Supports multiple documents per patient

### Diagnostics Agent
- **Queue**: `diagnostics`
- Embeds the clinical question using `gemini-embedding-001`
- Retrieves top-K similar chunks via cosine similarity across all patient documents
- Builds prompt with retrieved context
- Generates response + confidence score + top chunk similarity via `gemini-2.5-flash`
- Stores result in `diagnostics` collection with `approvalStatus: pending`

### Billing Agent
- **Queue**: `billing`
- Reads patient's medical history, diagnoses, and medications from MongoDB
- Uses Gemini to generate itemised invoice (consultation, AI analysis, document processing, medications)
- Stores result in `billingproposals` collection
- Supports insurance claim status tracking

### Security Agent
- **Queue**: `security`
- Runs 5 detection rules on every access log event:
  1. Odd-hour access (00:00–05:00)
  2. Rapid patient access (5+ records in 60 seconds)
  3. Brute-force attempts (3+ failed logins)
  4. Dangerous operations (DELETE / bulk update)
  5. Suspicious access patterns
- Writes anomaly events to `auditlogs` collection with severity level

---

## UI Pages

### Dashboard (`/`)
- 4 stat cards: Total Patients, Registered Today, AI Diagnostics Today, Avg Processing Time
- Recent patients table (name, age, status, registered date, view button)
- System Status panel: each agent with live green/red dot, queue depth, last job timestamp
- Real-time search filtering patient list
- Polls `/api/health` every 10 seconds

### Patients (`/patients`)
- Full-width table: Avatar, Name, Age, Gender, Blood Type, Status, Registered, Actions
- Search + status filter bar
- 10-per-page pagination
- Row click navigates to patient detail

### Patient Detail (`/patients/:id`)

**Overview Tab**
- Two-column layout: patient info fields (label: value) + Medical Documents section
- Medical Documents: per-file name, upload date, size, processing status badge
- Status polls every 3 seconds after upload until status = Indexed
- RAG Index Status row: `gemini-embedding-001 · 768 dimensions · N chunks · Indexed`
- Federated Patient Timeline: all agent events in chronological order

**AI Diagnostics Tab**
- Chat-style interface with markdown rendering (react-markdown)
- AI response includes: confidence progress bar, evidence chunk count, top similarity score, grounded excerpt
- Approve / Reject buttons (HITL) — stored in audit trail
- Collapsed accordion for past Q&As

**Billing Tab**
- Itemised invoice: Consultation, AI Analysis, Document Processing, Medications
- Insurance claim stepper: Pending → Submitted → Approved / Rejected
- Generate Bill button triggers billing agent
- PDF export
- Bill history table

### Security (`/security`)
- Live anomaly feed table with severity badges
- Detection rules panel: toggle on/off, editable thresholds, trigger count
- 24-hour threat sparkline chart (recharts)
- Audit log table: filters All / Normal / Anomaly / HITL Events + date range + search

### Settings (`/settings`)
- Profile: name, email, role (read-only)
- Change Password form
- System Info: MongoDB status, Redis status, Gemini API status
- About: IMHAS v2.0, full tech stack

---

## Roadmap

- [ ] WebSocket real-time push for agent job completion (replace polling)
- [ ] FHIR R4 patient data export
- [ ] Voice-to-text patient intake
- [ ] Multi-tenant hospital support
- [ ] Mobile app (React Native)
- [ ] Advanced analytics with time-series patient trends

---

## License

MIT License — see [LICENSE](LICENSE) for details.
