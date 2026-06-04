/**
 * NoteVault — Frontend Logic
 * Handles CRUD operations, search, filtering, and UI interactions.
 */

// ──────────────────────────────────────────────
// DOM References
// ──────────────────────────────────────────────
const notesGrid      = document.getElementById("notesGrid");
const emptyState     = document.getElementById("emptyState");
const searchInput    = document.getElementById("searchInput");
const newNoteBtn     = document.getElementById("newNoteBtn");
const filterChips    = document.getElementById("filterChips");

// Modal
const modalOverlay   = document.getElementById("modalOverlay");
const modalTitle     = document.getElementById("modalTitle");
const modalCloseBtn  = document.getElementById("modalCloseBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const noteForm       = document.getElementById("noteForm");
const noteIdField    = document.getElementById("noteIdField");
const titleField     = document.getElementById("titleField");
const categoryField  = document.getElementById("categoryField");
const contentField   = document.getElementById("contentField");

// Toast
const toast          = document.getElementById("toast");

// ──────────────────────────────────────────────
// State
// ──────────────────────────────────────────────
let allNotes = [];
let activeCategory = "All";
let searchDebounceTimer = null;

// ──────────────────────────────────────────────
// API Helpers
// ──────────────────────────────────────────────
const API_BASE = "/api/notes";

async function apiGet(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return res.json();
}

async function apiPost(url, body) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `POST failed: ${res.status}`);
    }
    return res.json();
}

async function apiPut(url, body) {
    const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `PUT failed: ${res.status}`);
    }
    return res.json();
}

async function apiPatch(url) {
    const res = await fetch(url, { method: "PATCH" });
    if (!res.ok) throw new Error(`PATCH failed: ${res.status}`);
    return res.json();
}

async function apiDelete(url) {
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) throw new Error(`DELETE failed: ${res.status}`);
    return res.json();
}

// ──────────────────────────────────────────────
// Load & Render Notes
// ──────────────────────────────────────────────
async function loadNotes() {
    try {
        const query = searchInput.value.trim();
        const url = query
            ? `${API_BASE}/search?q=${encodeURIComponent(query)}`
            : API_BASE;
        allNotes = await apiGet(url);
        renderNotes();
    } catch (err) {
        showToast("Failed to load notes: " + err.message, "error");
    }
}

function renderNotes() {
    // Filter by active category
    const filtered = activeCategory === "All"
        ? allNotes
        : allNotes.filter(n => n.category === activeCategory);

    if (filtered.length === 0) {
        notesGrid.innerHTML = "";
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";
    notesGrid.innerHTML = filtered.map((note, index) => `
        <article class="note-card" style="animation-delay: ${index * 0.05}s">
            <div class="note-card__header">
                <h3 class="note-card__title">${escapeHtml(note.title)}</h3>
                <button
                    class="note-card__pin ${note.pinned ? 'note-card__pin--active' : ''}"
                    onclick="togglePin(${note.id})"
                    title="${note.pinned ? 'Unpin' : 'Pin'} note"
                >📌</button>
            </div>
            <span class="note-card__category note-card__category--${note.category}">
                ${note.category}
            </span>
            <p class="note-card__content">${escapeHtml(note.content)}</p>
            <div class="note-card__footer">
                <span class="note-card__date">${formatDate(note.created_at)}</span>
                <div class="note-card__actions">
                    <button class="note-card__action note-card__action--edit"
                            onclick="openEditModal(${note.id})" title="Edit">✏️</button>
                    <button class="note-card__action note-card__action--delete"
                            onclick="deleteNote(${note.id})" title="Delete">🗑️</button>
                </div>
            </div>
        </article>
    `).join("");
}

// ──────────────────────────────────────────────
// CRUD Operations
// ──────────────────────────────────────────────
async function createNote(title, content, category) {
    await apiPost(API_BASE, { title, content, category });
    showToast("Note created! ✨", "success");
    await loadNotes();
}

async function updateNote(id, title, content, category) {
    await apiPut(`${API_BASE}/${id}`, { title, content, category });
    showToast("Note updated! ✅", "success");
    await loadNotes();
}

async function togglePin(id) {
    try {
        await apiPatch(`${API_BASE}/${id}/pin`);
        await loadNotes();
    } catch (err) {
        showToast("Failed to toggle pin: " + err.message, "error");
    }
}

async function deleteNote(id) {
    if (!confirm("Delete this note?")) return;
    try {
        await apiDelete(`${API_BASE}/${id}`);
        showToast("Note deleted 🗑️", "success");
        await loadNotes();
    } catch (err) {
        showToast("Failed to delete: " + err.message, "error");
    }
}

// ──────────────────────────────────────────────
// Modal Handling
// ──────────────────────────────────────────────
function openNewModal() {
    modalTitle.textContent = "New Note";
    noteIdField.value = "";
    titleField.value = "";
    contentField.value = "";
    categoryField.value = "General";
    showModal();
}

function openEditModal(id) {
    const note = allNotes.find(n => n.id === id);
    if (!note) return;
    modalTitle.textContent = "Edit Note";
    noteIdField.value = note.id;
    titleField.value = note.title;
    contentField.value = note.content;
    categoryField.value = note.category;
    showModal();
}

function showModal() {
    modalOverlay.classList.add("modal-overlay--visible");
    titleField.focus();
}

function hideModal() {
    modalOverlay.classList.remove("modal-overlay--visible");
}

// ──────────────────────────────────────────────
// Form Submission
// ──────────────────────────────────────────────
noteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title    = titleField.value.trim();
    const content  = contentField.value.trim();
    const category = categoryField.value;
    const id       = noteIdField.value;

    if (!title || !content) {
        showToast("Title and content are required!", "error");
        return;
    }

    try {
        if (id) {
            await updateNote(Number(id), title, content, category);
        } else {
            await createNote(title, content, category);
        }
        hideModal();
    } catch (err) {
        showToast("Error: " + err.message, "error");
    }
});

// ──────────────────────────────────────────────
// Event Listeners
// ──────────────────────────────────────────────

// New note button
newNoteBtn.addEventListener("click", openNewModal);

// Close modal
modalCloseBtn.addEventListener("click", hideModal);
modalCancelBtn.addEventListener("click", hideModal);
modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) hideModal();
});

// Close modal on Escape
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideModal();
});

// Search with debounce
searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(loadNotes, 300);
});

// Category filter chips
filterChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;

    const category = chip.dataset.category;
    activeCategory = category;

    // Update active chip styling
    filterChips.querySelectorAll(".chip").forEach(c => c.classList.remove("chip--active"));
    chip.classList.add("chip--active");

    renderNotes();
});

// ──────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(isoString) {
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } catch {
        return isoString;
    }
}

function showToast(message, type = "success") {
    toast.textContent = message;
    toast.className = "toast toast--visible toast--" + type;
    setTimeout(() => {
        toast.classList.remove("toast--visible");
    }, 2500);
}

// ──────────────────────────────────────────────
// Initialize
// ──────────────────────────────────────────────
loadNotes();
