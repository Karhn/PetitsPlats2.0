import { recipes } from "../data/recipes.js";

console.log("[app] module chargé");
console.log("[app] recipes importées :", Array.isArray(recipes), "longeur =", recipes?.length);

let ALL_RECIPES = recipes;

function normalize(string) {
    return (string ?? "")
    .toString()
    .toLowerCase()
    .trim()
}

function formatQuantity(quantity, unit) {
    if (quantity == null && !unit) return '';
    const unitLabel = unit ? ` ${unit}` : '';
    return quantity != null ? `${quantity}${unitLabel}` : `${unitLabel}`.trim();
}

function escapeHTML(string) {
    const p = document.createElement("p");
    p.textContent = string;
    return p.innerHTML
}

function uniqueSorted(array) {
    return [...new Set(array)].sort((a, b) => 
    a.localeCompare(b, 'fr', {sensitivity : 'base' }));
}

function buildRecipeInput(recipe) {
    return normalize([
        recipe.name,
        recipe.description,
        ...(recipe.ingredients ?? []).map(i => i.ingredient || "")
    ].join(""));
}

function buildPredicate(criteria) {
    const query = normalize(criteria.query || "");
    const hasTextQuery = query.length >= 3;

    const filters = criteria.filters || { ingredient: new Set(), appliance: new Set(), utensil: new Set() };

    function matchTags(recipe) {

        if (filters.ingredient.size) {
            const ingredientSet = new Set(
                (recipe.ingredients ?? []).map(i => normalize(i.ingredient || ""))
            );
            for ( const wanted of filters.ingredient) {
                if (!ingredientSet.has(normalize(wanted))) return false;
            }
        }

        if (filters.appliance.size) {
            const appliance = normalize(recipe.appliance || "");
            for (const wanted of filters.appliance) {
                if (appliance !== normalize(wanted)) return false;
            }
        }

        if (filters.utensil.size) {
            const utensilSet = new Set(
                (recipe.ustensils ?? []).map(i => normalize(i || ""))
            );
            for ( const wanted of filters.utensil) {
                if (!utensilSet.has(normalize(wanted))) return false;
            }
        }
        return true;
    }

    return function predicate(recipe) {
        if (hasTextQuery) {
            const inputSearch = buildRecipeInput(recipe);
            if (!inputSearch.includes(query)) return false; 
        }

        return matchTags(recipe);
    };
}

function searchArray(recipes, criteria) {
    const pred = buildPredicate(criteria);
    return recipes.filter(pred);
}

function ingredientListHTML(ingredient) {
    const ingredientItems = ingredient.map((ingredient) => {
        const ingredientName = ingredient.ingredient || '';
        const quantityLabel = formatQuantity(ingredient.quantity, ingredient.unit);
        
        return `
            <div class="ingredient-item">
                <span class="ingredient-name"> ${ingredientName} </span>
                <span class="ingredient-quantity"> ${quantityLabel || ''} </span>
            </div>
        `;
    });

    const middleIndex = Math.ceil(ingredientItems.length / 2);
    const columnLeft = ingredientItems.slice(0, middleIndex).join('');
    const columnRight = ingredientItems.slice(middleIndex).join('');

    return `
        <div class="row">
            <div class="col-6"> ${columnLeft} </div>
            <div class="col-6"> ${columnRight} </div>
        </div>
    `;
}

function recipeCardTemplate(recipe) {
    const preparationTime = recipe.time ?? recipe.prepTime ?? null;
    const imageSource = recipe.image ? `assets/css/images/${recipe.image}` : `assets/images/placeholder.jpg`;

    return `
        <div class="col-12 col-md-6 col-lg-4">
            <article class="card card-recipe h-100 shadow-sm border-0">
                <div class="position-relative">
                    <img src="${imageSource}" class="card-img-top" alt="${recipe.name ?? 'Recette'}" />
                    ${preparationTime ? `<span class="badge bg-warning text-dark badge-time"> ${preparationTime} min </span>` : ''}
                </div>
                <div class="card-body">
                    <h5 class="card-title mb-3"> ${recipe.name ?? 'Titre de la recette'} </h5>

                    <p class="card-recette text-uppercase text-muted fw-semibold small mb-1"> Recette </p>
                    <p class="card-text small"> ${recipe.description ?? ''} </p>

                    <p class="text-uppercase text-muted fw-semibold small mb-1 mt-3"> Ingrédients </p>
                    ${ingredientListHTML(recipe.ingredients ?? [] )}
                </div>
            </article>
        </div>
    `;
}

function renderGrid(recipesList, query = "") {
    const gridElement = document.getElementById("cardsGrid");
    if (!gridElement) {
        console.error("[renderGrid] #cardsGrid introuvable dans le DOM")
        return;
    }

    const results = recipesList.map(recipeCardTemplate).join("");
    gridElement.innerHTML = results;
    
    const counter = document.getElementById("recipesCount");
    if (counter) counter.textContent = recipesList.length;
    else console.warn("[renderGrid] #recipesCount introuvable");

    console.log("[renderGrid] recettes rendues =", recipesList.length);
    console.log("[renderGrid] grid innerHTML length =", gridElement.innerHTML.length);

    if (!results) {
        const safeQuery = escapeHTML(query);
        gridElement.innerHTML = `
        <div class="col-12">
            <div class="alert alert-info"> Aucune recette ne contient "${safeQuery}". </div>
        </div>`;
    }
}

function fillDropdown(id, values, colorClass='warning', category, selectedSet = new Set()) {
    const menu = document.getElementById(id);
    if (!menu) {
    console.warn(`[fillDropdown] #${id} introuvable`)
    return;
    }

    const selectedZone = menu.querySelector(".dropdown-selected-zone");
    if (!selectedZone) {
        console.warn(`[fillDropdown] .dropdown-selected-zone manquante dans #${id}`);
    return;
  }

    [...menu.querySelectorAll("li")].forEach((li, i) => {
        const isSearch = li.querySelector(".search-bar");
        const isSelectedZone = li.classList.contains("dropdown-selected-zone");
        if (!isSearch && !isSelectedZone) {
            li.remove();
        }
    });

    const frag = document.createDocumentFragment();
    
    values.forEach(v => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.classList = "dropdown-item";
        btn.textContent = v;
        btn.dataset.value = v;
        btn.dataset.category = category;

        btn.addEventListener("click", () => {
                addActiveTags(btn.dataset.value, colorClass, btn.dataset.category);
                runSearch();
            });
        li.appendChild(btn);
        frag.appendChild(li);
    });
    menu.appendChild(frag);

    reoderAndHighlightSelected(menu, selectedSet, category)
}

function buildFilterLists(recipesList, filters = { ingredient: new Set(), appliance: new Set(), utensil: new Set() }) {

    const ingredientsList = uniqueSorted(recipesList.flatMap((recipe) => 
    (recipe.ingredients ?? []).map((ing) => ing.ingredient || '').filter(Boolean)));

    const appliancesList = uniqueSorted(recipesList.map((recipe) => recipe.appliance || '').filter(Boolean));

    const ustensilsList = uniqueSorted(recipesList.flatMap((recipe) => (recipe.ustensils ?? [])).filter(Boolean));

    fillDropdown('dd-ingredients', ingredientsList, 'warning', 'ingredient', filters.ingredient);
    fillDropdown('dd-appliances', appliancesList, 'warning', 'appliance', filters.appliance);
    fillDropdown('dd-ustensils', ustensilsList, 'warning', 'utensil', filters.utensil);
}

function addActiveTags(label, color='warning', category) {
    const wrap = document.getElementById("activeTags");
    if ([...wrap.querySelectorAll(".badge")].some(b => b.dataset.label === label)) return;

    const badge = document.createElement('span');
    badge.className = `badge text-bg-${color} d-flex align-items-center gap-2 p-2`;
    badge.dataset.label = label;
    badge.dataset.category = category;
    badge.innerHTML = `
        ${label}
        <button type="button" class="btn-close btn-close-black btn-sm ms-1" aria-label="Supprimer"></button>
        `;
    wrap.appendChild(badge);

    badge.querySelector('button').addEventListener('click', () => {
        badge.remove();
        runSearch();
    });

    runSearch();
}

function collectCriteria() {
    const query = document.getElementById("mainSearch")?.value ?? "";

    const filters = { ingredient: new Set(), appliance: new Set(), utensil: new Set() };
    document.querySelectorAll("#activeTags .badge").forEach(badge => {
        const label = badge.dataset.label ?? "";
        const cat = badge.dataset.category;
        if (cat && label) filters[cat].add(label);
    });

  return { query, filters };
}

function runSearch() {
    const criteria = collectCriteria();

    const hasAnyTag =
        criteria.filters.ingredient.size ||
        criteria.filters.appliance.size ||
        criteria.filters.utensil.size;

    const q = (criteria.query ?? "").trim();
    const mustFilter = hasAnyTag || q.length >= 3;

    const results = mustFilter
        ? searchArray(ALL_RECIPES, criteria)
        : ALL_RECIPES;

    renderGrid(results, q);
    buildFilterLists(results, criteria.filters);
}

function setupMainSearch() {
    const input = document.getElementById("mainSearch");
    const button = document.getElementById("searchBtn");
    
    const triggerSearch = () => {
        const query = input.value.trim();
        if (query.length === 0 || query.length >= 3) {
            return runSearch();
        }
    };

    input.addEventListener("input", triggerSearch);

    if (button) {
        button.addEventListener("click", triggerSearch);
    }
}

function setupTagSearchInput(inputId, menuId, buttonId) {
    const input = document.getElementById(inputId);
    const menu = document.getElementById(menuId);
    const button = document.getElementById(buttonId);

    const runFilter = () => {
        const q = normalize(input.value.trim());
        menu.querySelectorAll("li > button.dropdown-item").forEach(btn => {
            const label = normalize(btn.dataset.value || btn.textContent || "");
            btn.parentElement.style.display = (!q || label.includes(q)) ? "" : "none";
        })
    }

    input.addEventListener("input", runFilter);

    if (button) {
        button.addEventListener("click", () => {
            runFilter();
            runSearch();
        });
    }

    const dropdownButton = menu.parentElement?.querySelector("[data-bs-toggle='dropdown']");
    if (dropdownButton) {
        dropdownButton.addEventListener("show.bs.dropdown", () => {
            input.value = "";
            menu.querySelectorAll("li").forEach(li => li.style.removeProperty("display"));
        });
    }
}

function removeActiveTag(label, category) {
    const wrap = document.getElementById("activeTags");
    if (!wrap) return;

    const badge = [...wrap.querySelectorAll(".badge")].find(b => b.dataset.label === label && (!category || b.dataset.category === category));
    if (badge) {
        badge.remove();
    }
}

function reoderAndHighlightSelected(menu, selectedSet = new Set(), category) {
    const selectedZone = menu.querySelector('.dropdown-selected-zone');
    const buttons = menu.querySelectorAll("li > button.dropdown-item");

    buttons.forEach(btn => {
        const li = btn.closest("li");
        const value = btn.dataset.value || btn.textContent.trim();
        const isSelected = selectedSet.has(value);

        btn.classList.toggle("selected", isSelected);

        let removeBtn = btn.querySelector(".remove-selected");

        if (isSelected) {
            if (!removeBtn) {
            removeBtn = document.createElement("span");
            removeBtn.className = "remove-selected";
            removeBtn.innerHTML = "&times;";

            removeBtn.addEventListener("click", (event) => {
                event.stopPropagation();
                removeActiveTag(value, category);
                runSearch();
            });
            btn.appendChild(removeBtn);

        } 
                selectedZone.insertAdjacentElement("afterend", li);
        } else {
            if (removeBtn) removeBtn.remove();
            menu.appendChild(li);
        }
    });

}

window.addEventListener('DOMContentLoaded', () => {
    renderGrid(ALL_RECIPES);
    buildFilterLists(ALL_RECIPES);
    setupMainSearch();
    setupTagSearchInput("tagSearchIngredients", "dd-ingredients", "btnTagIngredients");
    setupTagSearchInput("tagSearchAppliances",  "dd-appliances",  "btnTagAppliances");
    setupTagSearchInput("tagSearchUstensils",   "dd-ustensils",   "btnTagUstensils");
});