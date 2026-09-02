# MediVerify AI — Backend Server

AI-Powered Healthcare Fact Verification & Safe Guidance Assistant (FastAPI Backend)

---

## Overview

MediVerify AI is an educational healthcare information assistant built to verify healthcare claims, identify medical misinformation, provide evidence-based explanations, and offer safety guidance.

This Python FastAPI backend connects to:
- **Google Gemini API**: For generating clear, structured healthcare answers with prompt injection protection.
- **Supabase**: For authenticated user verification via JWTs and persisting conversation history.
- **Local Knowledge Base**: Cross-checking healthcare claims against trusted facts and medical sources (WHO, CDC, Mayo Clinic, FDA, etc.).

> **Notice:** MediVerify AI is strictly an educational tool. It does not diagnose diseases, prescribe medication, or replace professional healthcare consultations.

---

## Features

- **FastAPI REST API (`/api/v1`)**: Fully asynchronous endpoints with Pydantic v2 validation.
- **Fact Verification System**: Normalized status values matching the frontend (`TRUE | FALSE | MIXED | UNVERIFIED`).
- **Safety Keyword Scanner**: Detects emergency symptoms (e.g. chest pain, breathing difficulty, anaphylaxis) and returns immediate emergency directives.
- **Supabase Auth & Database**: Validates Supabase JWT tokens via `Authorization: Bearer <token>` and stores user conversations securely under RLS.
- **CORS Configured**: Allows requests from `http://localhost:5173`.
- **Demo Fallback System**: Reliable fallback responses for hackathon demo questions if the Gemini API key is missing or encounters network timeouts.

---

## Installation & Setup

### 1. Prerequisites
- Python 3.11+
- Virtual environment tool (`venv`)

### 2. Clone & Setup Environment

```bash
cd backend
python -m venv venv
```

Activate Virtual Environment:
- **Windows**:
  ```powershell
  .\venv\Scripts\activate
  ```
- **macOS/Linux**:
  ```bash
  source venv/bin/activate
  ```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure `.env`

Copy `.env.example` to `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

SUPABASE_URL=https://dvvzzgbojrqtzrgcisvq.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

FRONTEND_URL=http://localhost:5173

MAX_MESSAGE_LENGTH=2000
CHAT_HISTORY_CONTEXT_WINDOW=6
```

---

## Running the Server

Start Uvicorn server:

```bash
python run.py
```
Or directly with Uvicorn:
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be live at:
- **Base API**: `http://localhost:8000/api/v1`
- **Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc Docs**: `http://localhost:8000/redoc`

---

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/health` | Health check endpoint | No |
| `POST` | `/api/v1/chat` | Send question to AI Health Assistant | Optional (Saves if JWT provided) |
| `GET` | `/api/v1/history` | Get paginated conversations | Yes (Bearer JWT) |
| `GET` | `/api/v1/history/{id}` | Get messages for conversation | Yes (Bearer JWT) |
| `DELETE` | `/api/v1/history/{id}` | Delete a conversation | Yes (Bearer JWT) |
| `DELETE` | `/api/v1/history` | Clear all chat history | Yes (Bearer JWT) |

---

## Running Tests

Run pytest suite:

```bash
pytest
```

---

## Known Limitations & Demo Scope

- **Emergency Scanner**: Uses keyword matching as a prototype approximation for emergency symptom detection. False negatives are possible, so the system errs toward showing safety disclaimers.
- **Educational Scope**: Designed to educate users and refute common healthcare misinformation (such as taking antibiotics for colds or rapid excessive water drinking for dehydration).
