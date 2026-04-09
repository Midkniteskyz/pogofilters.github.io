const state = {
  filters: [],
  activeCategory: "all",
  searchText: "",
  selectedId: null
};

const presetGrid = document.getElementById("preset-grid");
const categoryRow = document.getElementById("category-row");
const quickPicks = document.getElementById("quick-picks");
const searchInput = document.getElementById("preset-search");
const resultsSummary = document.getElementById("results-summary");
const emptyState = document.getElementById("empty-state");

const previewName = document.getElementById("preview-name");
const previewQuery = document.getElementById("preview-query");
const previewDescription = document.getElementById("preview-description");
const previewTags = document.getElementById("preview-tags");
const copyPreviewButton = document.getElementById("copy-preview");

const themeButton = document.querySelector("[data-theme-toggle]");
const root = document.documentElement;

themeButton?.addEventListener("click", () => {
  const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", nextTheme);
});

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getCategories(filters) {
  const categories = [...new Set(filters.map((item) => item.category))];
  return ["all", ...categories];
}

function getQuickPicks(filters) {
  return filters.slice(0, 4);
}

function filterPresets() {
  return state.filters.filter((item) => {
    const matchesCategory =
      state.activeCategory === "all" || item.category === state.activeCategory;

    const haystack = [
      item.name,
      item.description,
      item.query,
      item.category,
      ...(item.tags || []),
      item.notes || ""
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = haystack.includes(state.searchText.toLowerCase());

    return matchesCategory && matchesSearch;
  });
}

function renderCategories() {
  const categories = getCategories(state.filters);

  categoryRow.innerHTML = categories
    .map(
      (category) => `
        <button
          class="category-chip ${category === state.activeCategory ? "is-active" : ""}"
          type="button"
          data-category="${category}"
        >
          ${titleCase(category)}
        </button>
      `
    )
    .join("");

  categoryRow.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeCategory = button.dataset.category;
      renderAll();
    });
  });
}

function renderQuickPicks() {
  const picks = getQuickPicks(state.filters);

  quickPicks.innerHTML = picks
    .map(
      (item) => `
        <button class="quick-chip" type="button" data-pick-id="${item.id}">
          ${item.name}
        </button>
      `
    )
    .join("");

  quickPicks.querySelectorAll("[data-pick-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const picked = state.filters.find((item) => item.id === button.dataset.pickId);
      if (!picked) return;

      state.activeCategory = picked.category;
      state.searchText = picked.name;
      searchInput.value = picked.name;
      state.selectedId = picked.id;
      renderAll();
    });
  });
}

function renderPreview(item) {
  if (!item) {
    previewName.textContent = "Select a preset";
    previewQuery.textContent = "Choose a preset to see the full query.";
    previewDescription.textContent = "Preset details will appear here.";
    previewTags.innerHTML = "";
    return;
  }

  previewName.textContent = item.name;
  previewQuery.textContent = item.query;
  previewDescription.textContent = item.notes || item.description;
  previewTags.innerHTML = (item.tags || [])
    .map((tag) => `<span class="tag">${tag}</span>`)
    .join("");
}

function attachCardEvents() {
  presetGrid.querySelectorAll("[data-select-id]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("[data-copy-query]")) return;
      state.selectedId = card.dataset.selectId;
      renderAll();
    });
  });

  presetGrid.querySelectorAll("[data-copy-query]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const query = button.dataset.copyQuery;
      await copyText(query, button);
    });
  });
}

function renderGrid() {
  const filtered = filterPresets();

  resultsSummary.textContent = `${filtered.length} preset${filtered.length === 1 ? "" : "s"} shown`;

  emptyState.classList.toggle("is-hidden", filtered.length > 0);

  presetGrid.innerHTML = filtered
    .map(
      (item) => `
        <article
          class="preset-card ${item.id === state.selectedId ? "is-selected" : ""}"
          data-category="${item.category}"
          data-select-id="${item.id}"
          tabindex="0"
        >
          <div class="card-top">
            <div>
              <h3>${item.name}</h3>
              <p class="card-copy">${item.description}</p>
            </div>
            <span class="card-badge">${titleCase(item.category)}</span>
          </div>

          <pre class="query-block"><code>${item.query}</code></pre>

          <div class="tag-row">
            ${(item.tags || []).map((tag) => `<span class="tag">${tag}</span>`).join("")}
          </div>

          <div class="card-actions">
            <button class="btn btn-primary" type="button" data-copy-query="${item.query}">
              Copy
            </button>
            <button class="btn btn-secondary" type="button">
              Select
            </button>
          </div>
        </article>
      `
    )
    .join("");

  attachCardEvents();

  const selectedStillVisible = filtered.some((item) => item.id === state.selectedId);
  const selectedItem =
    filtered.find((item) => item.id === state.selectedId) ||
    filtered[0] ||
    null;

  if (!selectedStillVisible && filtered[0]) {
    state.selectedId = filtered[0].id;
  }

  renderPreview(selectedItem);
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    if (button) {
      const original = button.textContent;
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = original;
      }, 1200);
    }
  } catch {
    if (button) {
      const original = button.textContent;
      button.textContent = "Copy failed";
      setTimeout(() => {
        button.textContent = original;
      }, 1200);
    }
  }
}

function renderAll() {
  renderCategories();
  renderGrid();
}

searchInput.addEventListener("input", (event) => {
  state.searchText = event.target.value.trim();
  renderGrid();
});

copyPreviewButton.addEventListener("click", async () => {
  const selected = state.filters.find((item) => item.id === state.selectedId);
  if (!selected) return;
  await copyText(selected.query, copyPreviewButton);
});

async function init() {
  try {
    const response = await fetch("./filters.json");
    if (!response.ok) {
      throw new Error("Failed to load filters.json");
    }

    state.filters = await response.json();
    state.selectedId = state.filters[0]?.id || null;

    renderQuickPicks();
    renderAll();
  } catch (error) {
    resultsSummary.textContent = "Could not load presets.";
    presetGrid.innerHTML = `
      <div class="empty-state">
        <h3>Could not load filters</h3>
        <p>Check that filters.json exists and is being served from the same folder.</p>
      </div>
    `;
  }
}

init();