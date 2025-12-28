const API_URL = "https://script.google.com/macros/s/AKfycbyt1rnaburyDKblXGC0BUKh6-1JLtGcOhxrZiNe8Bye09enlV_EU7_37WHFz4Ymo8_W/exec";

const rayonsContainer = document.getElementById('rayons-container');
const ajouterRayonBtn = document.getElementById('btn-ajouter-rayon');
const nomRayonInput = document.getElementById('nouveau-rayon');

/* --- AJOUT RAYON --- */
ajouterRayonBtn.addEventListener('click', () => {
  const nom = nomRayonInput.value.trim();
  if (!nom) return;
  const rayon = createRayon(nom);
  rayonsContainer.appendChild(rayon);
  nomRayonInput.value = '';
  save();
});

nomRayonInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') ajouterRayonBtn.click();
});

/* --- CREATE RAYON --- */
function createRayon(nom) {
  const rayon = document.createElement('div');
  rayon.className = 'rayon';
  rayon.dataset.id = crypto.randomUUID();
  rayon.setAttribute('draggable', 'true');

  rayon.innerHTML = `
    <div class="rayon-header">
      <button class="btn-deplacer-rayon" aria-label="Déplacer le rayon">☰</button>
      <h2>${nom}</h2>
      <div class="rayon-actions">
        <button class="btn-modifier-rayon" aria-label="Modifier le rayon">...</button>
        <button class="btn-supprimer-rayon" aria-label="Supprimer le rayon">x</button>
      </div>
    </div>
    <div class="produits-container"></div>
    <div class="rayon-footer">
      <input type="text" class="nouveau-produit" placeholder="Ajouter un produit">
    </div>
  `;

  initRayonActions(rayon);
  initTouchDrag(rayon);
  return rayon;
}

/* --- ACTIONS RAYON --- */
function initRayonActions(rayon) {
  const header = rayon.querySelector('.rayon-header');
  const btnSup = rayon.querySelector('.btn-supprimer-rayon');
  const btnMod = rayon.querySelector('.btn-modifier-rayon');
  const btnDrag = rayon.querySelector('.btn-deplacer-rayon');
  const inputProd = rayon.querySelector('.nouveau-produit');
  const contProd = rayon.querySelector('.produits-container');

  // 🔴 CORRECTION : sauvegarde obligatoire du collapsed
  header.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    rayon.classList.toggle('collapsed');
    save();
  });

  btnSup.addEventListener('click', () => {
    rayon.remove();
    save();
  });

  btnMod.addEventListener('click', () => {
    const titre = rayon.querySelector('h2');
    const nv = prompt("Nouveau nom:", titre.firstChild.textContent.trim());
    if (nv) {
      titre.firstChild.textContent = nv + ' ';
      save();
    }
  });

  inputProd.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = inputProd.value.trim();
      if (!val) return;
      addProduit(contProd, val);
      inputProd.value = '';
      save();
    }
  });

  rayon.addEventListener('dragstart', () => rayon.classList.add('dragging'));
  rayon.addEventListener('dragend', () => {
    rayon.classList.remove('dragging');
    save();
  });

  btnDrag.addEventListener('mousedown', () => rayon.setAttribute('draggable', 'true'));
  ['mouseup', 'mouseleave'].forEach(evt =>
    btnDrag.addEventListener(evt, () => rayon.removeAttribute('draggable'))
  );
}

/* --- PRODUIT --- */
function addProduit(container, nom) {
  const p = document.createElement('div');
  p.className = 'produit';
  p.dataset.id = crypto.randomUUID();

  p.innerHTML = `
    <input type="checkbox" class="produit-checkbox" aria-label="Produit ${nom}">
    <span class="produit-nom">${nom}</span>
    <div class="produit-actions">
      <button class="btn-modifier-produit" aria-label="Modifier le produit">...</button>
      <button class="btn-supprimer-produit" aria-label="Supprimer le produit">x</button>
    </div>
  `;

  const cb = p.querySelector('.produit-checkbox');
  const btnSup = p.querySelector('.btn-supprimer-produit');
  const btnMod = p.querySelector('.btn-modifier-produit');
  const nomSpan = p.querySelector('.produit-nom');

  cb.setAttribute('aria-checked', cb.checked);

  p.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    e.stopPropagation();
    container.querySelectorAll('.produit-actions').forEach(a => a.style.display = 'none');
    p.querySelector('.produit-actions').style.display = 'inline-block';
  });

  cb.addEventListener('change', () => {
    cb.setAttribute('aria-checked', cb.checked);
    cb.checked ? container.appendChild(p) : container.prepend(p);
    save();
  });

  btnSup.addEventListener('click', () => {
    p.remove();
    save();
  });

  btnMod.addEventListener('click', () => {
    const nv = prompt("Nouveau nom:", nomSpan.textContent);
    if (nv) {
      nomSpan.textContent = nv;
      save();
    }
  });

  container.appendChild(p);
}

/* --- SAVE API --- */
async function save() {
  const data = [];

  rayonsContainer.querySelectorAll('.rayon').forEach(rayon => {
    const nom = rayon.querySelector('h2').firstChild.textContent.trim();
    const collapsed = rayon.classList.contains('collapsed');
    const produits = [];

    rayon.querySelectorAll('.produit').forEach(p => {
      produits.push({
        id: p.dataset.id,
        nom: p.querySelector('.produit-nom').textContent,
        coche: p.querySelector('.produit-checkbox').checked
      });
    });

    data.push({ id: rayon.dataset.id, nom, collapsed, produits });
  });

  try {
    await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
  } catch (err) {
    console.error("Erreur save API :", err);
  }
}

/* --- LOAD API --- */
async function load() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    const activeInput = document.activeElement;
    const activeValue = activeInput?.value;

    const rayonsMap = {};
    rayonsContainer.querySelectorAll('.rayon').forEach(r => rayonsMap[r.dataset.id] = r);

    data.forEach(r => {
      let rayon = rayonsMap[r.id];
      if (!rayon) {
        rayon = createRayon(r.nom);
        rayon.dataset.id = r.id;
        rayonsContainer.appendChild(rayon);
      }

      rayon.querySelector('h2').firstChild.textContent = r.nom + ' ';
      rayon.classList.toggle('collapsed', r.collapsed);

      const cont = rayon.querySelector('.produits-container');
      const prodMap = {};
      cont.querySelectorAll('.produit').forEach(p => prodMap[p.dataset.id] = p);

      r.produits.forEach(p => {
        let prod = prodMap[p.id];
        if (!prod) {
          addProduit(cont, p.nom);
          prod = cont.lastChild;
          prod.dataset.id = p.id;
        }

        prod.querySelector('.produit-nom').textContent = p.nom;
        const cb = prod.querySelector('.produit-checkbox');
        cb.checked = p.coche;
        prod.classList.toggle('produit-coche', p.coche);
        cb.setAttribute('aria-checked', cb.checked);
      });

      cont.querySelectorAll('.produit').forEach(p => {
        if (!r.produits.find(x => x.id === p.dataset.id)) p.remove();
      });
    });

    rayonsContainer.querySelectorAll('.rayon').forEach(r => {
      if (!data.find(x => x.id === r.dataset.id)) r.remove();
    });

    if (activeInput?.classList.contains('nouveau-produit')) {
      activeInput.focus();
      activeInput.value = activeValue;
    }
  } catch (err) {
    console.error("Erreur load API :", err);
  }
}

/* --- SYNC LOOP --- */
let lastUpdate = 0;

async function syncLoop() {
  try {
    const res = await fetch(`${API_URL}?ping=1`);
    const { updated } = await res.json();
    if (updated !== lastUpdate) {
      lastUpdate = updated;
      await load();
    }
  } catch (err) {
    console.error("Erreur sync :", err);
  } finally {
    setTimeout(syncLoop, 1000);
  }
}

/* --- DRAG PC --- */
rayonsContainer.addEventListener('dragover', e => {
  e.preventDefault();
  const dragging = rayonsContainer.querySelector('.dragging');
  const after = getAfterElement(rayonsContainer, e.clientY);
  after ? rayonsContainer.insertBefore(dragging, after) : rayonsContainer.appendChild(dragging);
});

function getAfterElement(container, y) {
  return [...container.querySelectorAll('.rayon:not(.dragging)')]
    .reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: -Infinity }).element;
}

/* --- DRAG TACTILE --- */
function initTouchDrag(rayon) {
  const btn = rayon.querySelector('.btn-deplacer-rayon');
  let dragging = false;

  btn.addEventListener('touchstart', e => {
    dragging = true;
    rayon.classList.add('dragging');
    e.preventDefault();
  }, { passive: false });

  btn.addEventListener('touchmove', e => {
    if (!dragging) return;
    const y = e.touches[0].clientY;
    const after = getAfterElement(rayonsContainer, y);
    after ? rayonsContainer.insertBefore(rayon, after) : rayonsContainer.appendChild(rayon);
    e.preventDefault();
  }, { passive: false });

  btn.addEventListener('touchend', () => {
    dragging = false;
    rayon.classList.remove('dragging');
    save();
  });
}

/* --- INIT --- */
document.addEventListener('DOMContentLoaded', () => {
  load();
  syncLoop();
});
