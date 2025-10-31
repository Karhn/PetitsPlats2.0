import { recipes } from "../data/recipes.js";

console.log("[app] module chargé");
console.log("[app] recipes importées :", Array.isArray(recipes), "longeur =", recipes?.length);

let ALL_RECIPES = recipes;

function normalize(str) {
    return (str ?? "")
        .toString()
        .toLowerCase()
}

function formatQuantity(quantity, unit) {
    if (quantity == null && !unit) return '';
    const unitLabel = unit ? `${unit}` : '';
    return quantity != null ? `${quantity}${unitLabel}` : `${unitLabel}`.trim();
}

function uniqueSorted(array) {
    return [...new Set(array)].sort((a, b) => 
    a.localeCompare(b, 'fr', {sensitivity : 'base' }));
}

function searchArray(recipes, query) {
    const q = normalize(query);
    const hasQuery = q.length >= 3;
    if (!hasQuery) return recipes;

    return recipes.filter(recipe => normalize(recipe.name ?? "").includes(q));
}

function runSearch() {
    const query = document.getElementById("mainSearch")?.value?.trim() ?? "";
    const hasQuery = query.length >= 3;

    const start = performance.now();
    const results = hasQuery ? searchArray(ALL_RECIPES, query) : ALL_RECIPES;
    const end = performance.now();

    console.log(`[algo-array] ${results.length} résultats en ${(end - start).toFixed(2)} ms`);
    renderGrid(results);
    buildFilterLists(results);
}

function setupMainSearch() {
    const input = document.getElementById("mainSearch");
    if (!input) return;
     input.addEventListener("input", () => {
        const q = input.value.trim();
        if (q.length === 0 || q.length >= 3) runSearch();
    });
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
            <div class="alert alert-info"> Aucune carte générée (template vide). </div>
        </div>`;
    }
}

function fillDropdown(id, values) {
    const menu = document.getElementById(id);
    if (!menu) {
    console.warn(`[fillDropdown] #${id} introuvable`)
    return;
    }
    menu.innerHTML = values.map( v => `<li><button class="dropdown-item" type="button"> ${v} </button></li>`).join('');
}

function buildFilterLists(recipesList) {
    const ingredientsList = uniqueSorted(recipesList.flatMap((recipe) => 
    (recipe.ingredients ?? []).map((ing) => ing.ingredient ?? ing.name ?? '').filter(Boolean)));

    const appliancesList = uniqueSorted(recipesList.map((recipe) => recipe.appliance ?? '').filter(Boolean));

    const ustensilsList = uniqueSorted(recipesList.flatMap((recipe) => (recipe.ustensils ?? [])).filter(Boolean));

    fillDropdown('dd-ingredients', ingredientsList);
    fillDropdown('dd-appliances', appliancesList);
    fillDropdown('dd-ustensils', ustensilsList);
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
    setupMainSearch()
  } catch (err) {
    console.error(err);
  }
});