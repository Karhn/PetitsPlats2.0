import { recipes } from "../data/recipes.js";

console.log("[app] module chargé");
console.log("[app] recipes importées :", Array.isArray(recipes), "longeur =", recipes?.length);

let ALL_RECIPES = recipes;

function normalize(string) {
    return (string ?? "")
    .toString()
    .toLowerCase()
}


function buildPredicate(criteria) {
    const query = normalize(criteria.query || "");
    const hasTextQuery = query.length >= 3;

    const filters = criteria.filters || { ingredient: new Set(), appliance: new Set(), utensil: new Set() };

    function matchTags(recipe) {

        if (filters.ingredient.size) {
            const ingredientSet = new Set(
                (recipe.ingredients ?? []).map(i => normalize(i.ingredient ?? i.name ?? ""))
            );
            for ( const wanted of filters.ingredient) {
                if (!ingredientSet.has(normalize(wanted))) return false;
            }
        }

        if (filters.appliance.size) {
            const appliance = normalize(recipe.appliance ?? "");
            for (const wanted of filters.appliance) {
                if (appliance !== normalize(wanted)) return false;
            }
        }

        if (filters.utensil.size) {
            const utensilSet = new Set(
                (recipe.ustensils ?? []).map(i => normalize(i))
            );
            for ( const wanted of filters.utensil) {
                if (!utensilSet.has(normalize(wanted))) return false;
            }
        }
        return true;
    }

    return function predicate(recipe) {
        if (hasTextQuery) {
            const nameOnly = normalize(recipe.name ?? "");
            if (!nameOnly.includes(query))
            return false; }

        return matchTags(recipe);
    };
}


function searchArray(recipes, criteria) {
    const pred = buildPredicate(criteria);
    return recipes.filter(pred);
}


function collectCriteria() {
    const query = document.getElementById("mainSearch")?.value ?? "";

    const filters = { ingredient: new Set(), appliance: new Set(), utensil: new Set() };
    document.querySelectorAll("#activeTags .badge").forEach(badge => {
        const label = badge.dataset.label ?? "";
        const cat   = badge.dataset.category;
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

    renderGrid(results);
    buildFilterLists(results);
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


function formatQuantity(quantity, unit) {
    if (quantity == null && !unit) return '';
    const unitLabel = unit ? ` ${unit}` : '';
    return quantity != null ? `${quantity}${unitLabel}` : `${unitLabel}`.trim();
}

function uniqueSorted(array) {
    return [...new Set(array)].sort((a, b) => 
    a.localeCompare(b, 'fr', {sensitivity : 'base' }));
}

function ingredientListHTML(ingredient) {
    const ingredientItems = ingredient.map((ingredient) => {
        const ingredientName = ingredient.ingredient ?? ingredient.name ?? '';
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

function renderGrid(recipesList) {
    const gridElement = document.getElementById("cardsGrid");
    if (!gridElement) {
        console.error("[renderGrid] #cardsGrid introuvable dans le DOM")
        return;
    }

    const html = recipesList.map(recipeCardTemplate).join("");
    gridElement.innerHTML = html;
    
    const counter = document.getElementById("recipesCount");
    if (counter) counter.textContent = recipesList.length;
    else console.warn("[renderGrid] #recipesCount introuvable");

    console.log("[renderGrid] recettes rendues =", recipesList.length);
    console.log("[renderGrid] grid innerHTML length =", gridElement.innerHTML.length);

    if (!html) {
        gridElement.innerHTML = `
        <div class="col-12">
            <div class="alert alert-info"> Aucune recette trouver. </div>
        </div>`;
    }
}

function fillDropdown(id, values, colorClass='warning', category) {
    const menu = document.getElementById(id);
    if (!menu) {
    console.warn(`[fillDropdown] #${id} introuvable`)
    return;
    }
    menu.innerHTML = values.map( v => `<li><button class="dropdown-item" type="button" data-value="${v}"> ${v} </button></li>`).join('');

    menu.querySelectorAll('.dropdown-item').forEach(btn => {
        btn.addEventListener('click', () => {
            addActiveTags(btn.dataset.value, colorClass, category);
            btn.classList.add('selected');
            runSearch();
        });
    });
}

function buildFilterLists(recipesList) {

    const ingredientsList = uniqueSorted(recipesList.flatMap((recipe) => 
    (recipe.ingredients ?? []).map((ing) => ing.ingredient ?? ing.name ?? '').filter(Boolean)));

    const appliancesList = uniqueSorted(recipesList.map((recipe) => recipe.appliance ?? '').filter(Boolean));

    const ustensilsList = uniqueSorted(recipesList.flatMap((recipe) => (recipe.ustensils ?? [])).filter(Boolean));

    fillDropdown('dd-ingredients', ingredientsList, 'warning', 'ingredient');
    fillDropdown('dd-appliances', appliancesList, 'warning', 'appliance');
    fillDropdown('dd-ustensils', ustensilsList, 'warning', 'utensil');
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
        <button type="button" class="btn-close btn-close-white btn-sm ms-1" aria-label="Supprimer"></button>
        `;
    wrap.appendChild(badge);
    runSearch();

    badge.querySelector('button').addEventListener('click', () => {
        badge.remove();
        runSearch();
    });
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    const grid = document.getElementById("cardsGrid");
    if (grid) {
      grid.innerHTML = '<div class="col-12"><div class="card p-4">TEST CARTE</div></div>';
    }

    console.log("[app] ALL_RECIPES longueur =", ALL_RECIPES.length, "exemple =", ALL_RECIPES[0]);

    renderGrid(ALL_RECIPES);
    buildFilterLists(ALL_RECIPES);
    setupMainSearch();
  } catch (err) {
    console.error(err);
  }
});