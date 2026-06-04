"""
NoteVault — A beginner-friendly Personal Notes API built with FastAPI.

Features:
  • Create, Read, Update, Delete notes
  • Pin / unpin important notes
  • Assign categories (Work, Personal, Ideas, etc.)
  • Search notes by title or content

Run with:
    uvicorn main:app --reload
Then open http://127.0.0.1:8000 in your browser.
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# ──────────────────────────────────────────────
# 1.  Create the FastAPI application
# ──────────────────────────────────────────────
app = FastAPI(
    title="NoteVault API",
    description="A simple Personal Notes API for beginners",
    version="1.0.0",
)

# ──────────────────────────────────────────────
# 2.  Pydantic models (data validation)
# ──────────────────────────────────────────────

class NoteCreate(BaseModel):
    """Schema used when creating a NEW note."""
    title: str = Field(..., min_length=1, max_length=100, examples=["My first note"])
    content: str = Field(..., min_length=1, examples=["Hello world!"])
    category: str = Field(default="General", examples=["Work"])


class NoteUpdate(BaseModel):
    """Schema used when updating an EXISTING note (all fields optional)."""
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    content: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = None


class NoteResponse(BaseModel):
    """Schema returned to the frontend."""
    id: int
    title: str
    content: str
    category: str
    pinned: bool
    created_at: str
    updated_at: str


# ──────────────────────────────────────────────
# 3.  In-memory data store (no database needed!)
# ──────────────────────────────────────────────

notes_db: list[dict] = []
next_id: int = 1  # auto-increment counter


def _seed_data():
    """Pre-populate a few sample notes so the app isn't empty on first load."""
    global next_id
    samples = [
        {
            "title": "Welcome to NoteVault! 🎉",
            "content": "This is your personal notes app built with FastAPI. Try creating, editing, pinning, and deleting notes!",
            "category": "General",
            "pinned": True,
        },
        {
            "title": "Learn FastAPI Basics",
            "content": "FastAPI is a modern Python web framework. It uses Pydantic for data validation and automatic Swagger docs at /docs.",
            "category": "Ideas",
            "pinned": False,
        },
        {
            "title": "Grocery List",
            "content": "Milk, Eggs, Bread, Butter, Coffee, Bananas",
            "category": "Personal",
            "pinned": False,
        },
    ]
    now = datetime.now().isoformat()
    for sample in samples:
        notes_db.append(
            {
                "id": next_id,
                **sample,
                "created_at": now,
                "updated_at": now,
            }
        )
        next_id += 1

_seed_data()


# ──────────────────────────────────────────────
# 4.  API endpoints (CRUD + Pin + Search)
# ──────────────────────────────────────────────

@app.get("/api/notes", response_model=list[NoteResponse], tags=["Notes"])
def get_all_notes():
    """Return every note, pinned notes first, then newest first."""
    sorted_notes = sorted(
        notes_db,
        key=lambda n: (not n["pinned"], n["created_at"]),
        reverse=False,
    )
    # Pinned first (not True = False = 0 sorts first), then by created_at ascending
    # Actually let's sort pinned first, then newest first within each group
    sorted_notes = sorted(
        notes_db,
        key=lambda n: (not n["pinned"], n["id"]),
        reverse=False,
    )
    sorted_notes = sorted(
        sorted_notes,
        key=lambda n: (not n["pinned"], -n["id"]),
    )
    return sorted_notes


@app.get("/api/notes/search", response_model=list[NoteResponse], tags=["Notes"])
def search_notes(q: str = ""):
    """Search notes by title or content (case-insensitive)."""
    if not q.strip():
        return get_all_notes()
    query = q.lower()
    results = [
        n for n in notes_db
        if query in n["title"].lower() or query in n["content"].lower()
    ]
    return results


@app.get("/api/notes/{note_id}", response_model=NoteResponse, tags=["Notes"])
def get_note(note_id: int):
    """Get a single note by ID."""
    for note in notes_db:
        if note["id"] == note_id:
            return note
    raise HTTPException(status_code=404, detail="Note not found")


@app.post("/api/notes", response_model=NoteResponse, status_code=201, tags=["Notes"])
def create_note(data: NoteCreate):
    """Create a new note."""
    global next_id
    now = datetime.now().isoformat()
    note = {
        "id": next_id,
        "title": data.title,
        "content": data.content,
        "category": data.category,
        "pinned": False,
        "created_at": now,
        "updated_at": now,
    }
    notes_db.append(note)
    next_id += 1
    return note


@app.put("/api/notes/{note_id}", response_model=NoteResponse, tags=["Notes"])
def update_note(note_id: int, data: NoteUpdate):
    """Update an existing note (partial update)."""
    for note in notes_db:
        if note["id"] == note_id:
            if data.title is not None:
                note["title"] = data.title
            if data.content is not None:
                note["content"] = data.content
            if data.category is not None:
                note["category"] = data.category
            note["updated_at"] = datetime.now().isoformat()
            return note
    raise HTTPException(status_code=404, detail="Note not found")


@app.patch("/api/notes/{note_id}/pin", response_model=NoteResponse, tags=["Notes"])
def toggle_pin(note_id: int):
    """Toggle the pinned status of a note."""
    for note in notes_db:
        if note["id"] == note_id:
            note["pinned"] = not note["pinned"]
            note["updated_at"] = datetime.now().isoformat()
            return note
    raise HTTPException(status_code=404, detail="Note not found")


@app.delete("/api/notes/{note_id}", tags=["Notes"])
def delete_note(note_id: int):
    """Delete a note by ID."""
    for i, note in enumerate(notes_db):
        if note["id"] == note_id:
            notes_db.pop(i)
            return {"message": "Note deleted successfully"}
    raise HTTPException(status_code=404, detail="Note not found")


# ──────────────────────────────────────────────
# 5.  Serve the frontend (static files + index)
# ──────────────────────────────────────────────

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", include_in_schema=False)
def serve_frontend():
    """Serve the main HTML page."""
    return FileResponse("static/index.html")
