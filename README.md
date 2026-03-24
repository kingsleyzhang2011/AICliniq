# AICliniq: Professional Medical AI with Multi-Agent Consensus

AICliniq is a next-generation medical AI consultation system designed for high-accuracy and reliable health insights. By leveraging a **Multi-Agent Consensus** architecture, it simulates a professional clinical environment where multiple AI specialists collaborate to provide a comprehensive diagnosis.

## Key Features

- **Multi-Agent Workflow**: Features a "Chief Physician + Specialist Debate" model. A moderator GP coordinates specialist agents (Cardiology, Endocrinology, Nutrition, etc.) to reach a consensus, ensuring multi-dimensional analysis.
- **Medical RAG**: Integration with authoritative medical knowledge bases (e.g., NIH MedlinePlus, PubMed StatPearls) via a vector database, ensuring every piece of advice is grounded in evidence.
- **Privacy-First Architecture**: Built on **Supabase** with strict Row Level Security (RLS) and designed with data privacy standards in mind.
- **Interactive Multi-Stage Consultation**:
    1. **Intake**: Structure symptom collection by a virtual nurse.
    2. **Routing**: GP assessment and specialist recruitment.
    3. **Consultation**: Multi-specialist perspective sharing.
    4. **Consensus/Debate**: Identifying and resolving medical contradictions.
    5. **Summary**: Providing actionable conclusions and warning signs.

## Technology Stack

- **Frontend**: Vue 3 + Vite + Tailwind CSS + Pinia
- **Backend/DB**: Supabase (PostgreSQL + Vector)
- **AI Models**: Gemini 2.0 Flash (Default), Groq (Llama 3.3), SiliconFlow (Qwen 2.5)
- **RAG**: Google Embedding-001 + PGVector

---

> **Disclaimer**: This tool is for informational purposes only and does NOT constitute medical diagnosis or prescription. Always consult a professional healthcare provider for medical emergencies or specific health concerns.
