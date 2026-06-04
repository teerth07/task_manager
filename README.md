# Task Manager (NoteVault)

I built this modern Task Manager and Personal Notes application using **FastAPI** for the backend API and clean, vanilla HTML/CSS/JavaScript for the frontend dashboard. It features full CRUD capabilities, item pinning, category tagging, live search, and full Docker container support.

---

## Getting Started

### Run Locally (Without Docker)
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the development server:
   ```bash
   uvicorn main:app --reload
   ```
3. Open http://localhost:8000 in your browser.

### Run with Docker
1. Start the container:
   ```bash
   docker-compose up --build
   ```
2. Open http://localhost:8000 in your browser.