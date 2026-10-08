# Backend : .\venv\Scripts\Activate.ps1 uvicorn app.main:app --reload --port 8000

# CodeAI — AI-Powered Codebase Assistant

## Overview

CodeAI turns a GitHub repository into an intelligent, searchable knowledge base. Developers can connect a repository, ask natural-language questions about the codebase, inspect its structure, and understand unfamiliar code more quickly.

## Features

- **Repository intelligence** — indexes supported source files from a GitHub repository.
- **Semantic search** — finds relevant code by meaning, not only keyword matches.
- **Code-aware RAG** — stores file paths, estimated line ranges, and language metadata with each chunk.
- **Agentic reasoning** — a LangGraph agent can retrieve relevant code before answering.
- **Developer workspace** — repository sidebar, Markdown answers, syntax-highlighted code blocks, and source-aware responses.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend:** Python, FastAPI, Uvicorn, Pydantic
- **AI and RAG:** LangChain, LangGraph, Google Gemini, Sentence Transformers, FAISS
- **Infrastructure:** Docker and Docker Compose

## Architecture

```text
GitHub repository
  → repository ingestion
  → code-aware chunking
  → embeddings
  → FAISS vector store
  → RAG search tool
  → LangGraph agent
  → Gemini LLM
  → developer answer
```

### Ingestion

The backend reads the GitHub repository tree, filters supported source and documentation files, retrieves their content, splits them into language-aware chunks, and creates embeddings for the local FAISS vector store.

### Asking a question

```text
Workspace chat
  → POST /api/chat/
  → LangGraph agent
  → search_code tool / FAISS
  → Gemini
  → Markdown response in the workspace
```

## Environment Variables

Create `backend/.env`:

```env
LLM_API_KEY=your_gemini_api_key
GITHUB_TOKEN=your_github_personal_access_token
VECTOR_DB_PATH=./data/vector_store
```

`GITHUB_TOKEN` is optional for public repositories but is needed for private repositories or higher GitHub API limits.

## Run Locally

### Backend

```bash
cd backend
python -m venv venv
```

Activate the environment:

```bash
# Windows PowerShell
venv\Scripts\Activate.ps1

# macOS/Linux
source venv/bin/activate
```

Install dependencies and start the API:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Docker

From the repository root:

```bash
docker-compose up --build
```

The frontend is available at `http://localhost:5173`; the API is available at `http://localhost:8000`.

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/repositories/analyze` | Begin repository ingestion |
| `GET` | `/api/repositories/{repo_id}` | Get ingestion status |
| `GET` | `/api/repositories/{repo_id}/files` | Get indexed files |
| `POST` | `/api/chat/` | Ask a question about an indexed repository |

## Example Questions

- How does authentication work in this repository?
- Where is the database connection initialized?
- Which files handle user registration?
- Explain the project architecture.
- Where is the JWT token generated?

## Current Limitations

- Repository status is stored in backend memory and is lost when the backend restarts.
- Ingestion currently limits selected repository files to keep indexing fast.
- The vector store is local FAISS storage, suitable for local development.
- Chat history is preserved in the frontend workspace but is not yet persisted server-side.

## Future Improvements

- Persistent repository and conversation storage
- AST-aware chunking
- Structured file/line citations and source navigation
- Managed vector database support
- Additional repository tools and MCP interoperability
- GitLab and Bitbucket support
