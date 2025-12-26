const rayonsContainer = document.getElementById('rayons-container');
const ajouterRayonBtn = document.getElementById('btn-ajouter-rayon');
const nomRayonInput = document.getElementById('nouveau-rayon');

/* =========================
   AJOUT RAYON
========================= */
nomRayonInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        ajouterRayonBtn.click();
    }
});

ajouterRayonBtn.addEventListener('click', () => {
    const nomRayon = nomRayonInput.value.trim();
    if (!nomRayon) {
        alert('Veuillez entrer un nom de rayon valide.');
        return;
    }

    const rayon = createRayon(nomRayon);
    rayonsContainer.appendChild(rayon);
    nomRayonInput.value = '';
});

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
          <button class="btn-deplacer-produit">🤚</button>
        </div>
        
    `;

    initRayonActions(rayon);
    return rayon;
}

function initRayonActions(rayon) {
    const btnSupprimer = rayon.querySelector('.btn-supprimer-rayon');
    const btnModifier = rayon.querySelector('.btn-modifier-rayon');
    const btnAjouterProduit = rayon.querySelector('.btn-ajouter-produit');
    const inputProduit = rayon.querySelector('.nouveau-produit');
    const produitsContainer = rayon.querySelector('.produits-container');
    const titre = rayon.querySelector('h2');

    btnSupprimer.addEventListener('click', () => {
        rayon.remove();
    });

    btnModifier.addEventListener('click', () => {
        const nouveauNom = prompt('Entrez le nouveau nom du rayon:', titre.textContent);
        if (nouveauNom) {
            titre.textContent = nouveauNom;
        }
    });

    inputProduit.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        btnAjouterProduit.click();
    }
});

    btnAjouterProduit.addEventListener('click', () => {
        const nomProduit = inputProduit.value.trim();
        if (!nomProduit) {
            alert('Veuillez entrer un nom de produit valide.');
            return;
        }

        addProduit(produitsContainer, nomProduit);
        inputProduit.value = '';
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

    btnSupprimer.addEventListener('click', () => {
        produit.remove();
    });

    btnModifier.addEventListener('click', () => {
        const nouveauNom = prompt('Entrez le nouveau nom du produit:', nom.textContent);
        if (nouveauNom) {
            nom.textContent = nouveauNom;
        }
    });

    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            produit.classList.add('produit-coche');
            container.appendChild(produit);
        } else {
            produit.classList.remove('produit-coche');
            container.prepend(produit);
        }
    });
}

/* =========================
   DRAG & DROP
========================= */

let draggedRayon = null;

rayonsContainer.addEventListener('dragstart', (e) => {
    if(e.target.classList.contains('rayon')){
        draggedRayon = e.target;
        e.dataTransfer.effectAllowed = "move";
    }
});

rayonsContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(rayonsContainer, e.clientY);
    if(afterElement == null){
        rayonsContainer.appendChild(draggedRayon);
    } else {
        rayonsContainer.insertBefore(draggedRayon, afterElement);
    }
});

function getDragAfterElement(container, y){
    const draggableElements = [...container.querySelectorAll('.rayon:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if(offset < 0 && offset > closest.offset){
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}
