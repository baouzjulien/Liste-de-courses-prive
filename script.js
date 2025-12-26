/* =========================
   RÉFÉRENCES DOM PRINCIPALES
========================= */

// Conteneur qui contient tous les rayons
const rayonsContainer = document.getElementById('rayons-container');

// Bouton pour ajouter un rayon
const ajouterRayonBtn = document.getElementById('btn-ajouter-rayon');

// Input pour le nom du nouveau rayon
const nomRayonInput = document.getElementById('nouveau-rayon');


/* =========================
   AJOUT RAYON
========================= */

// Permet d’ajouter un rayon en appuyant sur Entrée dans l’input
nomRayonInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        ajouterRayonBtn.click();
    }
});

// Gestion du clic sur le bouton "Ajouter rayon"
ajouterRayonBtn.addEventListener('click', () => {

    // Nettoyage de la valeur saisie
    const nomRayon = nomRayonInput.value.trim();

    // Sécurité : pas de rayon vide
    if (!nomRayon) {
        alert('Veuillez entrer un nom de rayon valide.');
        return;
    }

    // Création du rayon (DOM)
    const rayon = createRayon(nomRayon);

    // Ajout dans le conteneur principal
    rayonsContainer.appendChild(rayon);

    // Réinitialisation de l’input
    nomRayonInput.value = '';
});


/* =========================
   CRÉATION D’UN RAYON
========================= */

// Fabrique un rayon complet (HTML + events)
function createRayon(nomRayon) {

    // Création du conteneur du rayon
    const rayon = document.createElement('div');
    rayon.className = 'rayon';

    // Rend le rayon déplaçable (drag & drop)
    rayon.setAttribute('draggable', 'true');

    // Structure HTML interne du rayon
    rayon.innerHTML = `
        <div class="rayon-header">
            <h2>${nomRayon}</h2>
            <div class="rayon-actions">
                <button class="btn-modifier-rayon">🖋️</button>
                <button class="btn-supprimer-rayon">❌</button>
            </div>
        </div>

        <div class="produits-container"></div>

        <div class="rayon-footer">
            <input type="text" class="nouveau-produit" placeholder="Ajout produit">
            <button class="btn-ajouter-produit">➕</button>
            <button class="btn-deplacer-produit">↕️</button>
        </div>
    `;

    // Initialisation des événements propres à ce rayon
    initRayonActions(rayon);
    initTouchDrag(rayon);

    return rayon;
}


/* =========================
   EVENTS D’UN RAYON
========================= */

function initRayonActions(rayon) {

    // Récupération des éléments internes du rayon
    const btnSupprimer = rayon.querySelector('.btn-supprimer-rayon');
    const btnModifier = rayon.querySelector('.btn-modifier-rayon');
    const btnAjouterProduit = rayon.querySelector('.btn-ajouter-produit');
    const inputProduit = rayon.querySelector('.nouveau-produit');
    const produitsContainer = rayon.querySelector('.produits-container');
    const titre = rayon.querySelector('h2');

    // Suppression du rayon
    btnSupprimer.addEventListener('click', () => {
        rayon.remove();
    });

    // Modification du nom du rayon
    btnModifier.addEventListener('click', () => {
        const nouveauNom = prompt(
            'Entrez le nouveau nom du rayon:',
            titre.textContent
        );
        if (nouveauNom) {
            titre.textContent = nouveauNom;
        }
    });

    // Ajout produit via Entrée
    inputProduit.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            btnAjouterProduit.click();
        }
    });

    // Ajout produit via bouton
    btnAjouterProduit.addEventListener('click', () => {

        const nomProduit = inputProduit.value.trim();

        if (!nomProduit) {
            alert('Veuillez entrer un nom de produit valide.');
            return;
        }

        // Création du produit dans CE rayon
        addProduit(produitsContainer, nomProduit);

        // Reset input
        inputProduit.value = '';
    });
}


/* =========================
   PRODUITS
========================= */

// Création d’un produit
function addProduit(container, nomProduit) {

    const produit = document.createElement('div');
    produit.className = 'produit';

    produit.innerHTML = `
        <input type="checkbox" class="produit-checkbox">
        <span class="produit-nom">${nomProduit}</span>
        <div class="produit-actions">
            <button class="btn-modifier-produit">🖋️</button>
            <button class="btn-supprimer-produit">❌</button>
        </div>
    `;

    // Initialisation des events du produit
    initProduitActions(produit, container);

    // Ajout au conteneur produits
    container.appendChild(produit);
}


// Gestion des actions sur un produit
function initProduitActions(produit, container) {

    const checkbox = produit.querySelector('.produit-checkbox');
    const btnSupprimer = produit.querySelector('.btn-supprimer-produit');
    const btnModifier = produit.querySelector('.btn-modifier-produit');
    const nom = produit.querySelector('.produit-nom');

    // Suppression du produit
    btnSupprimer.addEventListener('click', () => {
        produit.remove();
    });

    // Modification du nom du produit
    btnModifier.addEventListener('click', () => {
        const nouveauNom = prompt(
            'Entrez le nouveau nom du produit:',
            nom.textContent
        );
        if (nouveauNom) {
            nom.textContent = nouveauNom;
        }
    });

    // Gestion du coche / décoche
    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            produit.classList.add('produit-coche');
            // Produit coché → fin de liste
            container.appendChild(produit);
        } else {
            produit.classList.remove('produit-coche');
            // Produit décoché → haut de liste
            container.prepend(produit);
        }
    });
}


/* =========================
   DRAG & DROP (RAYONS)
========================= */

// Référence du rayon actuellement déplacé
let draggedRayon = null;
let touchDraggedRayon = null;
let touchStartY = 0;

// Début du drag
rayonsContainer.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('rayon')) {
        draggedRayon = e.target;
        draggedRayon.classList.add('dragging');
    }
});

// Fin du drag (nettoyage)
rayonsContainer.addEventListener('dragend', () => {
    if (draggedRayon) {
        draggedRayon.classList.remove('dragging');
        draggedRayon = null;
    }
});

// Gestion du déplacement pendant le drag
rayonsContainer.addEventListener('dragover', (e) => {
    e.preventDefault();

    // Élément après lequel insérer le rayon
    const afterElement = getDragAfterElement(rayonsContainer, e.clientY);

    if (afterElement == null) {
        rayonsContainer.appendChild(draggedRayon);
    } else {
        rayonsContainer.insertBefore(draggedRayon, afterElement);
    }
});


// Détermine la position d’insertion selon la souris
function getDragAfterElement(container, y) {

    // Tous les rayons sauf celui en cours de drag
    const draggableElements = [
        ...container.querySelectorAll('.rayon:not(.dragging)')
    ];

    return draggableElements.reduce((closest, child) => {

        // Position de l’élément
        const box = child.getBoundingClientRect();

        // Distance entre la souris et le centre de l’élément
        const offset = y - box.top - box.height / 2;

        // On cherche l’élément juste au-dessus de la souris
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }

    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Initialisation du drag tactile pour un rayon
function initTouchDrag(rayon) {
    rayon.addEventListener('touchstart', (e) => {
        // Un seul doigt
        if (e.touches.length !== 1) return;

        touchDraggedRayon = rayon;
        touchStartY = e.touches[0].clientY;

        rayon.classList.add('dragging');
        e.preventDefault(); // empêche scroll / zoom iOS
    }, { passive: false });

    rayon.addEventListener('touchmove', (e) => {
        if (!touchDraggedRayon) return;

        const touchY = e.touches[0].clientY;
        const afterElement = getDragAfterElement(rayonsContainer, touchY);

        if (afterElement == null) {
            rayonsContainer.appendChild(touchDraggedRayon);
        } else {
            rayonsContainer.insertBefore(touchDraggedRayon, afterElement);
        }

        e.preventDefault();
    }, { passive: false });

    rayon.addEventListener('touchend', () => {
        if (!touchDraggedRayon) return;

        touchDraggedRayon.classList.remove('dragging');
        touchDraggedRayon = null;
    });
}


