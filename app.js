"use strict";

// ============================================
// CONFIGURAÇÃO E DADOS
// ============================================

const STORAGE_KEY = "evaluations";

let evaluations = [];
let currentFilter = "pending";
let editingId = null;

const $ = id => document.getElementById(id);


// ============================================
// IDENTIFICADORES
// ============================================

function createId() {
    return crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
}


// ============================================
// ARMAZENAMENTO
// ============================================

// Começa vazio se ainda não existirem dados.
// Também permite carregar os dados da versão anterior.

function load() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            evaluations = [];
            return;
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            evaluations = [];
            return;
        }

        evaluations = parsed
            .filter(item =>
                item &&
                typeof item.name === "string" &&
                !Number.isNaN(new Date(item.date).getTime())
            )
            .map(item => ({
                id: item.id || createId(),
                name: item.name.trim(),
                date: item.date,
                priority: ["low", "medium", "high"].includes(item.priority)
                    ? item.priority
                    : "medium",
                notes: typeof item.notes === "string" ? item.notes : "",
                completed: item.completed === true
            }));

        save();

    } catch (error) {
        console.error("Erro ao carregar avaliações:", error);
        evaluations = [];
    }
}


function save() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(evaluations)
        );
    } catch (error) {
        console.error("Erro ao guardar dados:", error);
        alert("Não foi possível guardar os dados.");
    }
}


// ============================================
// DATAS
// ============================================

function formatDate(value) {
    const date = new Date(value);

    return new Intl.DateTimeFormat("pt-PT", {
        weekday: "short",
        day: "numeric",
        month: "short"
    }).format(date);
}


function formatTime(value) {
    return new Date(value).toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit"
    });
}


function getRemaining(value) {
    const difference = new Date(value).getTime() - Date.now();

    if (difference <= 0) {
        return {
            expired: true,
            text: "Prazo ultrapassado"
        };
    }

    const seconds = Math.floor(difference / 1000);

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return {
        expired: false,
        text: `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`
    };
}


// ============================================
// ESTADOS
// ============================================

function getStatus(evaluation) {
    if (evaluation.completed) return "gray";

    const difference =
        new Date(evaluation.date).getTime() - Date.now();

    const day = 86400000;

    if (difference <= 0) return "gray";
    if (difference < day * 4) return "red";
    if (difference < day * 14) return "orange";

    return "green";
}


function getPriorityLabel(priority) {
    const labels = {
        low: "Prioridade baixa",
        medium: "Prioridade média",
        high: "Prioridade alta"
    };

    return labels[priority] || labels.medium;
}


// ============================================
// DASHBOARD
// ============================================

function renderDashboard() {
    const now = Date.now();

    const pending = evaluations.filter(e => !e.completed);
    const completed = evaluations.filter(e => e.completed);

    const urgent = pending.filter(e => {
        const remaining = new Date(e.date).getTime() - now;

        return remaining > 0 && remaining < 4 * 86400000;
    });

    $("pendingCount").textContent = pending.length;
    $("completedCount").textContent = completed.length;
    $("urgentCount").textContent = urgent.length;

    const upcoming = pending
        .filter(e => new Date(e.date).getTime() > now)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const container = $("nextDeadline");

    if (upcoming.length === 0) {
        container.innerHTML = `
            <div class="next-label">PRÓXIMA AVALIAÇÃO</div>
            <div class="next-empty">Tudo organizado! 🎉</div>
            <div class="next-date">
                ${pending.length
                    ? "Tens avaliações por concluir com prazo ultrapassado."
                    : "Ainda não tens avaliações agendadas."}
            </div>
        `;

        return;
    }

    const next = upcoming[0];
    const remaining = getRemaining(next.date);

    container.innerHTML = `
        <div class="next-label">PRÓXIMA AVALIAÇÃO</div>
        <div class="next-name"></div>
        <div class="next-date">
            ${formatDate(next.date)} · ${formatTime(next.date)}
        </div>
        <div class="countdown">${remaining.text}</div>
    `;

    // Evita inserir nomes diretamente em HTML.
    container.querySelector(".next-name").textContent = next.name;
}


// ============================================
// LISTA
// ============================================

function renderList() {
    const list = $("deadlineList");
    const search = $("searchInput").value
        .trim()
        .toLowerCase();

    let filtered = [...evaluations];

    if (currentFilter === "pending") {
        filtered = filtered.filter(e => !e.completed);
    }

    if (currentFilter === "completed") {
        filtered = filtered.filter(e => e.completed);
    }

    if (search) {
        filtered = filtered.filter(e =>
            e.name.toLowerCase().includes(search) ||
            e.notes.toLowerCase().includes(search)
        );
    }

    filtered.sort((a, b) =>
        new Date(a.date) - new Date(b.date)
    );

    list.innerHTML = "";

    if (filtered.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";

        const icon = document.createElement("div");
        icon.className = "empty-icon";

        const title = document.createElement("div");
        title.className = "empty-title";

        const description = document.createElement("div");
        description.className = "empty-description";

        if (search) {
            icon.textContent = "🔎";
            title.textContent = "Sem resultados";
            description.textContent =
                "Não encontrámos avaliações com esse nome.";
        } else if (currentFilter === "completed") {
            icon.textContent = "📚";
            title.textContent = "Ainda não concluíste avaliações";
            description.textContent =
                "Quando terminares uma avaliação, podes marcá-la como concluída.";
        } else if (currentFilter === "all") {
            icon.textContent = "📅";
            title.textContent = "Ainda não tens avaliações";
            description.textContent =
                "Adiciona a tua primeira avaliação para começares a organizar os teus prazos.";
        } else {
            icon.textContent = "✨";
            title.textContent = "Tudo em dia!";
            description.textContent =
                "Não tens avaliações pendentes.";
        }

        empty.append(icon, title, description);
        list.appendChild(empty);

        return;
    }

    filtered.forEach(evaluation => {
        const element = document.createElement("article");

        element.className = "deadline";

        if (evaluation.completed) {
            element.classList.add("completed");
        }

        const dot = document.createElement("div");
        dot.className = `status ${getStatus(evaluation)}`;

        const info = document.createElement("div");
        info.className = "deadline-info";

        const name = document.createElement("div");
        name.className = "deadline-name";
        name.textContent = evaluation.name;

        const date = document.createElement("div");
        date.className = "deadline-date";
        date.textContent =
            `${formatDate(evaluation.date)} · ${formatTime(evaluation.date)}`;

        const priority = document.createElement("span");
        priority.className = `priority ${evaluation.priority}`;
        priority.textContent = getPriorityLabel(evaluation.priority);

        info.append(name, date, priority);

        if (evaluation.notes) {
            const notes = document.createElement("div");

            notes.className = "deadline-date";
            notes.textContent = evaluation.notes;

            info.appendChild(notes);
        }

        const remaining = document.createElement("div");
        remaining.className = "remaining";

        if (evaluation.completed) {
            remaining.textContent = "Concluída";
        } else {
            remaining.textContent =
                getRemaining(evaluation.date).text;
        }

        const actions = document.createElement("div");
        actions.className = "deadline-actions";

        const completeButton = document.createElement("button");
        completeButton.className = "action-button complete";
        completeButton.textContent = evaluation.completed ? "↶" : "✓";
        completeButton.title = evaluation.completed
            ? "Reabrir avaliação"
            : "Marcar como concluída";

        completeButton.addEventListener("click", () => {
            toggleCompleted(evaluation.id);
        });

        const editButton = document.createElement("button");
        editButton.className = "action-button";
        editButton.textContent = "✎";
        editButton.title = "Editar avaliação";

        editButton.addEventListener("click", () => {
            openEditModal(evaluation.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "action-button delete";
        deleteButton.textContent = "×";
        deleteButton.title = "Eliminar avaliação";

        deleteButton.addEventListener("click", () => {
            deleteEvaluation(evaluation.id);
        });

        actions.append(
            completeButton,
            editButton,
            deleteButton
        );

        element.append(dot, info, remaining, actions);

        list.appendChild(element);
    });
}


// ============================================
// ATUALIZAÇÃO
// ============================================

function update() {
    renderDashboard();
    renderList();
}


// Atualiza apenas o contador da próxima avaliação.
// Não reconstrói a lista inteira a cada segundo.

function updateCountdown() {
    const pending = evaluations
        .filter(e =>
            !e.completed &&
            new Date(e.date).getTime() > Date.now()
        )
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const countdown = document.querySelector(".countdown");

    if (!countdown) return;

    countdown.textContent = getRemaining(pending[0].date).text;
}


// ============================================
// CONCLUIR
// ============================================

function toggleCompleted(id) {
    const evaluation = evaluations.find(e => e.id === id);

    if (!evaluation) return;

    evaluation.completed = !evaluation.completed;

    save();
    update();
}


// ============================================
// ELIMINAR
// ============================================

function deleteEvaluation(id) {
    const evaluation = evaluations.find(e => e.id === id);

    if (!evaluation) return;

    if (!confirm(`Queres eliminar "${evaluation.name}"?`)) {
        return;
    }

    evaluations = evaluations.filter(e => e.id !== id);

    save();
    update();
}


// ============================================
// MODAL
// ============================================

function openModal() {
    editingId = null;

    $("modalTitle").textContent = "Adicionar avaliação";
    $("saveButton").textContent = "Guardar avaliação";

    $("nameInput").value = "";
    $("dateInput").value = "";
    $("timeInput").value = "23:59";
    $("priorityInput").value = "medium";
    $("notesInput").value = "";

    $("modal").classList.remove("hidden");

    $("nameInput").focus();
}


function openEditModal(id) {
    const evaluation = evaluations.find(e => e.id === id);

    if (!evaluation) return;

    editingId = id;

    const date = new Date(evaluation.date);

    $("modalTitle").textContent = "Editar avaliação";
    $("saveButton").textContent = "Guardar alterações";

    $("nameInput").value = evaluation.name;

    const localDate = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");

    $("dateInput").value = localDate;

    $("timeInput").value = [
        String(date.getHours()).padStart(2, "0"),
        String(date.getMinutes()).padStart(2, "0")
    ].join(":");

    $("priorityInput").value = evaluation.priority;
    $("notesInput").value = evaluation.notes;

    $("modal").classList.remove("hidden");
}


function closeModal() {
    $("modal").classList.add("hidden");
    editingId = null;
}


// ============================================
// GUARDAR AVALIAÇÃO
// ============================================

function saveEvaluation() {
    const name = $("nameInput").value.trim();
    const date = $("dateInput").value;
    const time = $("timeInput").value;
    const priority = $("priorityInput").value;
    const notes = $("notesInput").value.trim();

    if (!name || !date || !time) {
        alert("Preenche o nome, a data e a hora.");
        return;
    }

    const newDate = new Date(`${date}T${time}:00`);

    if (Number.isNaN(newDate.getTime())) {
        alert("A data ou a hora não são válidas.");
        return;
    }

    const dateValue =
        `${date}T${time}:00`;

    if (editingId) {
        const evaluation = evaluations.find(e => e.id === editingId);

        if (!evaluation) return;

        evaluation.name = name;
        evaluation.date = dateValue;
        evaluation.priority = priority;
        evaluation.notes = notes;

    } else {
        evaluations.push({
            id: createId(),
            name,
            date: dateValue,
            priority,
            notes,
            completed: false
        });
    }

    save();
    closeModal();
    update();
}


// ============================================
// FILTROS
// ============================================

document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        document.querySelectorAll(".filter").forEach(item => {
            item.classList.toggle(
                "active",
                item === button
            );
        });

        renderList();
    });
});


$("searchInput").addEventListener("input", renderList);


// ============================================
// EXPORTAR DADOS
// ============================================

function exportData() {
    const backup = {
        app: "Entregas",
        version: 2,
        exportedAt: new Date().toISOString(),
        evaluations
    };

    const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "entregas-backup.json";

    link.click();

    URL.revokeObjectURL(url);
}


// ============================================
// IMPORTAR DADOS
// ============================================

function importData(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);

            const imported = Array.isArray(data)
                ? data
                : data.evaluations;

            if (!Array.isArray(imported)) {
                throw new Error("Formato inválido");
            }

            const valid = imported
                .filter(e =>
                    e &&
                    typeof e.name === "string" &&
                    !Number.isNaN(new Date(e.date).getTime())
                )
                .map(e => ({
                    id: createId(),
                    name: e.name.trim(),
                    date: e.date,
                    priority: ["low", "medium", "high"].includes(e.priority)
                        ? e.priority
                        : "medium",
                    notes: typeof e.notes === "string" ? e.notes : "",
                    completed: e.completed === true
                }));

            if (!valid.length && imported.length) {
                throw new Error("Não existem avaliações válidas");
            }

            if (!confirm(
                `Foram encontradas ${valid.length} avaliações. ` +
                "Queres substituir os dados atuais?"
            )) {
                return;
            }

            evaluations = valid;

            save();
            update();

            alert("Cópia de segurança importada com sucesso!");

        } catch (error) {
            console.error(error);
            alert("Não foi possível importar o ficheiro.");
        }

        $("importInput").value = "";
    };

    reader.readAsText(file);
}


// ============================================
// EVENTOS
// ============================================

$("addButton").addEventListener("click", openModal);

$("closeModal").addEventListener("click", closeModal);

$("saveButton").addEventListener("click", saveEvaluation);

$("exportButton").addEventListener("click", exportData);

$("importButton").addEventListener("click", () => {
    $("importInput").click();
});

$("importInput").addEventListener("change", event => {
    importData(event.target.files[0]);
});

$("modal").addEventListener("click", event => {
    if (event.target === $("modal")) {
        closeModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeModal();
    }
});


// ============================================
// INICIALIZAÇÃO
// ============================================

load();
update();

setInterval(updateCountdown, 1000);