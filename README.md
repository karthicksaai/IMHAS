# IMHAS - Intelligent Multi-Agent Hospital System

> **Advanced AI-powered hospital management system with RAG-based diagnostics, intelligent billing optimization, and real-time security monitoring.**

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.0-red.svg)](https://redis.io/)
[![Gemini](https://img.shields.io/badge/Gemini-2.0%20Flash-orange.svg)](https://ai.google.dev/)

---

## Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Agents](#-agents)
- [Contributing](#-contributing)
- [License](#-license)

---

## Features

### **AI-Powered Agents**
- **Intake Agent**: Automated patient document processing with LLM-based data extraction
- **RAG Indexer**: BERT embeddings (384-dim) + semantic search for medical records
- **Diagnostics Agent**: Retrieval-Augmented Generation with Gemini 2.0 Flash
- **Billing Agent**: Intelligent cost optimization using AI-driven alternative selection
- **Security Agent**: Real-time anomaly detection with 5 detection rules

### **Clinical Features**
- Patient intake with medical document upload (PDF, TXT, DOC)
- AI diagnostic assistant with context-aware responses
- Automatic medical history extraction (allergies, medications, conditions)
- RAG-based question answering from patient records

### **Billing Optimization**
- AI-powered treatment alternative suggestions
- Multi-tier discount engine (bulk, senior, chronic conditions)
- Cost savings tracking (10-40% average reduction)
- Real-time optimization with patient condition awareness

### **Security & Compliance**
- Complete audit trail for all access events
- 5-level anomaly detection system
- Real-time security alerts
- HIPAA-aligned access logging

### **Data Flow**

Patient Intake
Frontend → Backend → Intake Queue → Intake Agent → MongoDB
→ RAG Queue → RAG Agent → Embeddings

AI Diagnostics
Frontend → Backend → Diagnostics Queue → Diagnostics Agent
↓
(Retrieve embeddings)
↓
(Gemini LLM)
↓
Response → MongoDB

Billing Optimization
Frontend → Backend → Billing Queue → Billing Agent
↓
(AI optimization)
↓
Proposal → MongoDB

## Tech Stack

### **Backend**
- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Database**: MongoDB 7.0
- **Queue**: Redis + BullMQ
- **API**: REST

### **AI/ML**
- **LLM**: Google Gemini 2.0 Flash
- **Embeddings**: BERT MiniLM-L6-v2 (384-dim)
- **Vector Search**: In-memory cosine similarity
- **NLP**: Xenova Transformers.js

### **Frontend**
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State**: Context API

### **DevOps**
- **Containerization**: Docker + Docker Compose
- **Version Control**: Git
- **Package Manager**: npm

---

## Prerequisites

### **Required**
- Node.js 20.x or higher
- MongoDB 7.0 or higher
- Redis 7.0 or higher
- Google Gemini API Key ([Get it here](https://ai.google.dev/))

### **Recommended**
- Docker & Docker Compose (for easy deployment)
- 8GB RAM minimum (for BERT embeddings)
- Modern browser (Chrome, Firefox, Safari)

---

## Installation

### **Option 1: Docker (Recommended)**

1. **Clone the repository**
git clone https://github.com/yourusername/imhas.git
cd imhas
Set up environment variables

bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
Start all services

bash
docker-compose up -d
Access the application

Frontend: http://localhost:3000

Backend API: http://localhost:5001

MongoDB: localhost:27017

Redis: localhost:6379

Option 2: Manual Setup
1. Install Dependencies
bash
# Backend
cd backend
npm install

# Each Agent
cd ../agents/intake-agent && npm install
cd ../rag-indexer-agent && npm install
cd ../diagnostics-agent && npm install
cd ../billing-agent && npm install
cd ../security-agent && npm install

# Frontend
cd ../../frontend
npm install
2. Set Up Environment
Create .env files in:

Root directory

backend/.env

agents/intake-agent/.env

agents/rag-indexer-agent/.env

agents/diagnostics-agent/.env

agents/billing-agent/.env

agents/security-agent/.env

frontend/.env

Example .env:

text
MONGO_URI=mongodb://127.0.0.1:27017/hospital-ai
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
GEMINI_API_KEY=your-key-here
3. Start Services
Terminal 1: MongoDB

bash
mongod --dbpath ./data/db
Terminal 2: Redis

bash
redis-server
Terminal 3: Backend

bash
cd backend
npm start
Terminal 4-8: Agents

bash
# Terminal 4
cd agents/intake-agent && npm start

# Terminal 5
cd agents/rag-indexer-agent && npm start

# Terminal 6
cd agents/diagnostics-agent && npm start

# Terminal 7
cd agents/billing-agent && npm start

# Terminal 8
cd agents/security-agent && npm start
Terminal 9: Frontend

bash
cd frontend
npm run dev

Usage
1. Patient Intake
Login to the dashboard (default: any email/password in dev mode)

Click "Register New Patient"

Fill in patient details:

Name

Age

Upload medical document (PDF/TXT)

Submit and wait for processing (~5-10 seconds)

2. AI Diagnostics
Navigate to patient details page

Click "AI Diagnostics" tab

Ask questions like:

"What are the patient's main symptoms?"

"What diagnosis do you suggest?"

"Any allergies or medication conflicts?"

Get AI-powered responses with source citations

3. Billing Optimization
Go to patient's "Billing" tab

Add treatments/medications with costs

Click "Optimize Costs"

View AI-suggested alternatives and savings

4. Security Monitoring
Navigate to Security Dashboard

View real-time audit logs

Check anomaly alerts

Filter by user, action, or anomaly status


Endpoints
Patients
text
GET    /patients              # List all patients
GET    /patients/:id          # Get patient details
GET    /patients/:id/documents
GET    /patients/:id/diagnostics
GET    /patients/:id/billing
PUT    /patients/:id          # Update patient
Intake
text
POST   /intake                # Register new patient
                              # Body: FormData with name, age, file
Diagnostics
text
POST   /diagnostics           # Create diagnostic query
                              # Body: { patientId, question }
GET    /diagnostics/patient/:patientId
GET    /diagnostics/:id
Billing
text
POST   /billing               # Optimize billing
                              # Body: { patientId, treatments }
GET    /billing/patient/:patientId
GET    /billing/:id
Security
text
POST   /security/log          # Log access event
GET    /security/logs         # Get audit logs
GET    /security/alerts       # Get anomalies

Agents
1. Intake Agent
Queue: intake

Purpose: Extract structured medical data from documents

Process:

Receive patient data + document

Parse document using Gemini LLM

Extract allergies, medications, conditions, vitals

Update patient record

Trigger RAG indexing

2. RAG Indexer Agent
Queue: rag

Purpose: Create searchable embeddings

Process:

Receive document text

Chunk text (500 chars, 100 overlap)

Generate BERT embeddings (384-dim)

Store in MongoDB

3. Diagnostics Agent
Queue: diagnostics

Purpose: Answer medical questions

Process:

Receive question

Embed question (BERT)

Retrieve top-6 similar chunks (cosine similarity)

Generate response using Gemini + context

Return answer with confidence score

4. Billing Agent
Queue: billing

Purpose: Optimize treatment costs

Process:

Receive treatments list

For each treatment, find alternatives

Use Gemini to select best option

Apply discount rules

Calculate savings

5. Security Agent
Queue: security

Purpose: Detect anomalies

Detections:

Odd-hour access (0-5 AM)

Rapid patient access (5+ in 60s)

Brute force attempts (3+ failed logins)

Dangerous operations (deletions)

Suspicious patterns

Testing
Run Backend Tests
bash
cd backend
npm test
Run Frontend Tests
bash
cd frontend
npm test
Manual Testing
Use Postman/Insomnia for API testing

Import collection from docs/postman_collection.json

Troubleshooting
Problem: Agents not processing jobs
Check Redis connection: redis-cli ping

Verify MongoDB: mongosh

Check agent logs: docker logs imhas-intake-agent

Problem: Embeddings generation slow
First-time model download takes 2-3 minutes

Subsequent runs are fast (model cached)

Problem: Gemini API errors
Verify API key in .env

Check quota: https://ai.google.dev/

Rate limit: 60 requests/minute

Contributing
Contributions are welcome! Please follow these steps:

Fork the repository

Create a feature branch (git checkout -b feature/amazing-feature)

Commit changes (git commit -m 'Add amazing feature')

Push to branch (git push origin feature/amazing-feature)

Open a Pull Request

License
This project is licensed under the MIT License - see the LICENSE file for details.


Acknowledgments
Google Gemini for LLM capabilities

Xenova for Transformers.js

MongoDB team for excellent documentation

BullMQ for robust queue management

Support
For issues and questions:

GitHub Issues: Create an issue

Email: support@imhas.com

Documentation: Full Docs

Roadmap
 Add user authentication (JWT)

 Implement role-based access control (RBAC)

 Add real-time notifications (WebSockets)

 Integrate with EHR systems (HL7/FHIR)

 Add voice-to-text for patient intake

 Multi-language support

 Mobile app (React Native)

 Advanced analytics dashboard

Made with ❤️ for better healthcare

text

***

## **LICENSE** (Root Level)
MIT License

Copyright (c) 2026 IMHAS Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

CMD ["node", "src/index.js"]
