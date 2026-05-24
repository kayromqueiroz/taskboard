const columns = {
  todo: {
    label: "A fazer",
    list: document.querySelector("#todo-list"),
    count: document.querySelector("#todo-column-count"),
  },
  doing: {
    label: "Fazendo",
    list: document.querySelector("#doing-list"),
    count: document.querySelector("#doing-column-count"),
  },
  done: {
    label: "Concluido",
    list: document.querySelector("#done-list"),
    count: document.querySelector("#done-column-count"),
  },
};

const priorityLabels = {
  high: "Alta",
  medium: "Media",
  low: "Baixa",
};

const form = document.querySelector("#task-form");
const titleInput = document.querySelector("#title");
const descriptionInput = document.querySelector("#description");
const statusInput = document.querySelector("#status");
const priorityInput = document.querySelector("#priority");
const tagInput = document.querySelector("#tag");
const dueDateInput = document.querySelector("#due-date");
const formTitle = document.querySelector("#form-title");
const submitButton = document.querySelector("#submit-button");
const cancelEditButton = document.querySelector("#cancel-edit");
const clearButton = document.querySelector("#clear-tasks");
const searchFilter = document.querySelector("#search-filter");
const priorityFilter = document.querySelector("#priority-filter");
const tagFilter = document.querySelector("#tag-filter");

const activeCountEl = document.querySelector("#active-count");
const todoCountEl = document.querySelector("#todo-count");
const doingCountEl = document.querySelector("#doing-count");
const doneCountEl = document.querySelector("#done-count");
const highCountEl = document.querySelector("#high-count");

let editingTaskId = null;
let draggedTaskId = null;
let tasks = JSON.parse(localStorage.getItem("taskboard:tasks")) || [
  {
    id: crypto.randomUUID(),
    title: "Definir escopo do projeto",
    description: "Listar telas, regras e funcionalidades principais.",
    status: "todo",
    priority: "high",
    tag: "Pesquisa",
    dueDate: new Date().toISOString().slice(0, 10),
  },
  {
    id: crypto.randomUUID(),
    title: "Criar layout inicial",
    description: "Montar estrutura visual do quadro Kanban.",
    status: "doing",
    priority: "medium",
    tag: "Design",
    dueDate: new Date().toISOString().slice(0, 10),
  },
  {
    id: crypto.randomUUID(),
    title: "Publicar primeira versao",
    description: "Subir arquivos no GitHub Pages.",
    status: "done",
    priority: "low",
    tag: "Frontend",
    dueDate: new Date().toISOString().slice(0, 10),
  },
];

tasks = tasks.map((task) => ({
  ...task,
  tag: task.tag || "Frontend",
}));

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

dueDateInput.value = new Date().toISOString().slice(0, 10);

function saveTasks() {
  localStorage.setItem("taskboard:tasks", JSON.stringify(tasks));
}

function resetForm() {
  form.reset();
  editingTaskId = null;
  formTitle.textContent = "Criar card";
  submitButton.textContent = "Adicionar";
  cancelEditButton.classList.add("hidden");
  dueDateInput.value = new Date().toISOString().slice(0, 10);
}

function getFilteredTasks() {
  const searchTerm = searchFilter.value.trim().toLowerCase();
  const selectedPriority = priorityFilter.value;
  const selectedTag = tagFilter.value;

  return tasks.filter((task) => {
    const matchesSearch =
      searchTerm === "" ||
      task.title.toLowerCase().includes(searchTerm) ||
      task.description.toLowerCase().includes(searchTerm);
    const matchesPriority = selectedPriority === "all" || task.priority === selectedPriority;
    const matchesTag = selectedTag === "all" || task.tag === selectedTag;

    return matchesSearch && matchesPriority && matchesTag;
  });
}

function updateSummary() {
  activeCountEl.textContent = tasks.filter((task) => task.status !== "done").length;
  todoCountEl.textContent = tasks.filter((task) => task.status === "todo").length;
  doingCountEl.textContent = tasks.filter((task) => task.status === "doing").length;
  doneCountEl.textContent = tasks.filter((task) => task.status === "done").length;
  highCountEl.textContent = tasks.filter((task) => task.priority === "high").length;
}

function createTaskCard(task) {
  const card = document.createElement("article");
  const isOverdue = task.status !== "done" && new Date(`${task.dueDate}T23:59:59`) < new Date();
  card.className = `task-card ${isOverdue ? "overdue" : ""}`;
  card.draggable = true;
  card.dataset.id = task.id;
  card.innerHTML = `
    <p class="task-title">${task.title}</p>
    ${task.description ? `<p class="task-description">${task.description}</p>` : ""}
    <div class="task-footer">
      <span class="badge priority-${task.priority}">${priorityLabels[task.priority]}</span>
      <span class="tag-badge">${task.tag}</span>
      <span class="due-date ${isOverdue ? "overdue-text" : ""}">${dateFormatter.format(new Date(`${task.dueDate}T00:00:00`))}</span>
    </div>
    ${isOverdue ? '<span class="overdue-alert">Prazo atrasado</span>' : ""}
    <div class="task-actions">
      <button class="icon-button" type="button" data-action="edit" data-id="${task.id}" aria-label="Editar ${task.title}" title="Editar">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 20h9" stroke-width="2" stroke-linecap="round" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke-width="2" stroke-linejoin="round" />
        </svg>
      </button>
      <button class="icon-button danger" type="button" data-action="delete" data-id="${task.id}" aria-label="Excluir ${task.title}" title="Excluir">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 6h18" stroke-width="2" stroke-linecap="round" />
          <path d="M8 6V4h8v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M19 6l-1 14H6L5 6" stroke-width="2" stroke-linejoin="round" />
          <path d="M10 11v5M14 11v5" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  `;

  card.addEventListener("dragstart", () => {
    draggedTaskId = task.id;
    card.classList.add("dragging");
  });

  card.addEventListener("dragend", () => {
    draggedTaskId = null;
    card.classList.remove("dragging");
  });

  return card;
}

function renderBoard() {
  const filteredTasks = getFilteredTasks();

  Object.values(columns).forEach((column) => {
    column.list.innerHTML = "";
  });

  Object.entries(columns).forEach(([status, column]) => {
    const columnTasks = filteredTasks.filter((task) => task.status === status);
    column.count.textContent = columnTasks.length;

    if (columnTasks.length === 0) {
      column.list.innerHTML = '<div class="empty-state">Nenhuma tarefa aqui.</div>';
      return;
    }

    columnTasks.forEach((task) => {
      column.list.appendChild(createTaskCard(task));
    });
  });
}

function renderApp() {
  updateSummary();
  renderBoard();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const task = {
    id: editingTaskId || crypto.randomUUID(),
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    status: statusInput.value,
    priority: priorityInput.value,
    tag: tagInput.value,
    dueDate: dueDateInput.value,
  };

  if (editingTaskId) {
    tasks = tasks.map((currentTask) => (currentTask.id === editingTaskId ? task : currentTask));
  } else {
    tasks.push(task);
  }

  saveTasks();
  renderApp();
  resetForm();
  titleInput.focus();
});

document.querySelector("#kanban-board").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const taskId = button.dataset.id;
  const action = button.dataset.action;
  const task = tasks.find((currentTask) => currentTask.id === taskId);

  if (!task) {
    return;
  }

  if (action === "delete") {
    tasks = tasks.filter((currentTask) => currentTask.id !== taskId);
    saveTasks();
    renderApp();

    if (editingTaskId === taskId) {
      resetForm();
    }

    return;
  }

  editingTaskId = taskId;
  titleInput.value = task.title;
  descriptionInput.value = task.description;
  statusInput.value = task.status;
  priorityInput.value = task.priority;
  tagInput.value = task.tag;
  dueDateInput.value = task.dueDate;
  formTitle.textContent = "Editar card";
  submitButton.textContent = "Salvar alteracao";
  cancelEditButton.classList.remove("hidden");
  titleInput.focus();
});

document.querySelectorAll(".kanban-column").forEach((column) => {
  column.addEventListener("dragover", (event) => {
    event.preventDefault();
    column.classList.add("drag-over");
  });

  column.addEventListener("dragleave", () => {
    column.classList.remove("drag-over");
  });

  column.addEventListener("drop", () => {
    column.classList.remove("drag-over");

    if (!draggedTaskId) {
      return;
    }

    tasks = tasks.map((task) =>
      task.id === draggedTaskId ? { ...task, status: column.dataset.status } : task
    );
    saveTasks();
    renderApp();
  });
});

cancelEditButton.addEventListener("click", () => {
  resetForm();
  titleInput.focus();
});

searchFilter.addEventListener("input", renderBoard);
priorityFilter.addEventListener("change", renderBoard);
tagFilter.addEventListener("change", renderBoard);

clearButton.addEventListener("click", () => {
  tasks = [];
  saveTasks();
  resetForm();
  renderApp();
});

resetForm();
renderApp();
