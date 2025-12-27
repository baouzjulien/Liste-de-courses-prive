/* =========================
   RÉFÉRENCES DOM PRINCIPALES
========================= */

const rayonsContainer = document.getElementById('rayons-container');
const ajouterRayonBtn = document.getElementById('btn-ajouter-rayon');
const nomRayonInput = document.getElementById('nouveau-rayon');

/* =========================
   AJOUT RAYON
========================= */

nomRayonInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') ajouterRayonBtn.click();
});

ajouterRayonBtn.addEventListener('click', () => {
    const nomRayon = nomRayonInput.value.trim();
    if (!nomRayon) {
        alert('Veuillez entrer un nom de rayon valide.');
        return;
    }
    const rayon = createRayon(nomRayon);
    rayonsContainer.appendChild(rayon);
    saveToLocalStorage();
    nomRayonInput.value = '';
});

/* =========================
   CRÉATION D’UN RAYON
========================= */

function createRayon(nomRayon) {
    const rayon = document.createElement('div');
    rayon.className = 'rayon';
    rayon.setAttribute('draggable', 'true');

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
            <button class="btn-deplacer-produit">Déplacer</button>
        </div>
    `;

    initRayonActions(rayon);
    initTouchDrag(rayon);

    return rayon;
}

/* =========================
   EVENTS D’UN RAYON
========================= */

function initRayonActions(rayon) {
    const btnSupprimer = rayon.querySelector('.btn-supprimer-rayon');
    const btnModifier = rayon.querySelector('.btn-modifier-rayon');
    const btnDeplacer = rayon.querySelector('.btn-deplacer-produit');
    const btnAjouterProduit = rayon.querySelector('.btn-ajouter-produit');
    const inputProduit = rayon.querySelector('.nouveau-produit');
    const produitsContainer = rayon.querySelector('.produits-container');
    const titre = rayon.querySelector('h2');

    btnSupprimer.addEventListener('click', () => rayon.remove());
    saveToLocalStorage();
    btnModifier.addEventListener('click', () => {
        const nouveauNom = prompt('Entrez le nouveau nom du rayon:', titre.textContent);
        if (nouveauNom) titre.textContent = nouveauNom;
        saveToLocalStorage();
    });

    inputProduit.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnAjouterProduit.click();
    });

    btnAjouterProduit.addEventListener('click', () => {
        const nomProduit = inputProduit.value.trim();
        if (!nomProduit) {
            alert('Veuillez entrer un nom de produit valide.');
            return;
        }
        addProduit(produitsContainer, nomProduit);
        inputProduit.value = '';
        saveToLocalStorage();
    });
    

    btnDeplacer.addEventListener('mousedown', () => {
            rayon.setAttribute('draggable', 'true');
    });

    btnDeplacer.addEventListener('mouseup', () => {
            rayon.removeAttribute('draggable');
    });

    btnDeplacer.addEventListener('mouseleave', () => {
            rayon.removeAttribute('draggable');
    });

}

/* =========================
   PRODUITS
========================= */

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
    initProduitActions(produit, container);
    container.appendChild(produit);
}

function initProduitActions(produit, container) {
    const checkbox = produit.querySelector('.produit-checkbox');
    const btnSupprimer = produit.querySelector('.btn-supprimer-produit');
    const btnModifier = produit.querySelector('.btn-modifier-produit');
    const nom = produit.querySelector('.produit-nom');

    btnSupprimer.addEventListener('click', () => produit.remove());
    saveToLocalStorage();
    btnModifier.addEventListener('click', () => {
        const nouveauNom = prompt('Entrez le nouveau nom du produit:', nom.textContent);
        if (nouveauNom) nom.textContent = nouveauNom;
        saveToLocalStorage();
    });

    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            produit.classList.add('produit-coche');
            container.appendChild(produit);
        } else {
            produit.classList.remove('produit-coche');
            container.prepend(produit);
        }
        saveToLocalStorage();
    });
}

/* =========================
   DRAG & DROP (PC)
========================= */

let draggedRayon = null;

rayonsContainer.addEventListener('dragstart', (e) => {
    if (!e.target.classList.contains('rayon')) return;
    draggedRayon = e.target;
    draggedRayon.classList.add('dragging');
});

rayonsContainer.addEventListener('dragend', () => {
    if (!draggedRayon) return;
    draggedRayon.classList.remove('dragging');
    draggedRayon = null;
    saveToLocalStorage();
});

rayonsContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggedRayon) return;

    const afterElement = getDragAfterElement(rayonsContainer, e.clientY);
    if (!afterElement) {
        rayonsContainer.appendChild(draggedRayon);
    } else {
        rayonsContainer.insertBefore(draggedRayon, afterElement);
    }
});

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.rayon:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: child };
        else return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/* =========================
   DRAG TACTILE FLUIDE
========================= */

function initTouchDrag(rayon) {
    const btnDeplacer = rayon.querySelector('.btn-deplacer-produit');
    if (!btnDeplacer) return;

    let isDragging = false;

    btnDeplacer.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;

        isDragging = true;
        rayon.classList.add('dragging');

        e.preventDefault();
    }, { passive: false });

    btnDeplacer.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        const touchY = e.touches[0].clientY;
        const afterElement = getDragAfterElement(rayonsContainer, touchY);

        if (!afterElement) {
            rayonsContainer.appendChild(rayon);
        } else {
            rayonsContainer.insertBefore(rayon, afterElement);
        }

        e.preventDefault();
    }, { passive: false });

    btnDeplacer.addEventListener('touchend', () => {
        if (!isDragging) return;

        isDragging = false;
        rayon.classList.remove('dragging');
        saveToLocalStorage();
    });
}

/* =========================
   Gestion du localStorage
========================= */

function saveToLocalStorage() {
    const data = { rayons: [] };

    document.querySelectorAll('.rayon').forEach(rayon => {
        const nomRayon = rayon.querySelector('h2').textContent;
        const produits = [];

        rayon.querySelectorAll('.produit').forEach(produit => {
            produits.push({
                nom: produit.querySelector('.produit-nom').textContent,
                coche: produit.querySelector('.produit-checkbox').checked
            });
        });

        data.rayons.push({ nom: nomRayon, produits });
    });

    localStorage.setItem('listeCoursesData', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('listeCoursesData');
    if (!saved) return;

    const data = JSON.parse(saved);
    rayonsContainer.innerHTML = '';

    data.rayons.forEach(rayonData => {
        const rayon = createRayon(rayonData.nom);
        rayonsContainer.appendChild(rayon);

        const produitsContainer = rayon.querySelector('.produits-container');

        rayonData.produits.forEach(p => {
            addProduit(produitsContainer, p.nom);
            const produit = produitsContainer.lastElementChild;
            const checkbox = produit.querySelector('.produit-checkbox');

            checkbox.checked = p.coche;
            if (p.coche) produit.classList.add('produit-coche');
        });
    });
}

document.addEventListener('DOMContentLoaded', loadFromLocalStorage);

