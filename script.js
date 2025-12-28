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
nomRayonInput.addEventListener('keydown', e => { if (e.key === 'Enter') ajouterRayonBtn.click(); });

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

  header.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    rayon.classList.toggle('collapsed');
  });

  btnSup.addEventListener('click', () => { rayon.remove(); save(); });
  btnMod.addEventListener('click', () => {
    const titre = rayon.querySelector('h2');
    const nv = prompt("Nouveau nom:", titre.firstChild.textContent.trim());
    if (nv) { titre.firstChild.textContent = nv + ' '; save(); }
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
  rayon.addEventListener('dragend', () => { rayon.classList.remove('dragging'); save(); });

  btnDrag.addEventListener('mousedown', () => rayon.setAttribute('draggable', 'true'));
  ['mouseup','mouseleave'].forEach(evt => btnDrag.addEventListener(evt, () => rayon.removeAttribute('draggable')));
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
    container.querySelectorAll('.produit-actions').forEach(act => {
      if (act !== p.querySelector('.produit-actions')) act.style.display = 'none';
    });
    p.querySelector('.produit-actions').style.display = 'inline-block';
  });

  cb.addEventListener('change', () => {
    cb.setAttribute('aria-checked', cb.checked);
    p.classList.toggle('produit-coche', cb.checked);
    if(cb.checked) container.appendChild(p); else container.prepend(p);
    save();
  });

  btnSup.addEventListener('click', () => { p.remove(); save(); });
  btnMod.addEventListener('click', () => {
    const nv = prompt("Nouveau nom:", nomSpan.textContent);
    if (nv) { nomSpan.textContent = nv; save(); }
  });

  container.appendChild(p);
}

/* --- SAVE --- */
async function save() {
  const data = [];
  rayonsContainer.querySelectorAll('.rayon').forEach(rayon => {
    const nom = rayon.querySelector('h2').firstChild.textContent.trim();
    const collapsed = rayon.classList.contains('collapsed');
    const produits = [];
    rayon.querySelectorAll('.produit').forEach(p => {
      produits.push({ id: p.dataset.id, nom: p.querySelector('.produit-nom').textContent, coche: p.querySelector('.produit-checkbox').checked });
    });
    data.push({ id: rayon.dataset.id, nom, collapsed, produits });
  });

  try {
    await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
  } catch(err) { console.error("Erreur save API :", err); }
}

/* --- LOAD STABLE --- */
async function load() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    rayonsContainer.innerHTML = ""; // clear all before rebuild
    data.forEach(r => {
      const rayon = createRayon(r.nom);
      rayon.dataset.id = r.id;
      rayon.classList.toggle('collapsed', r.collapsed);

      const cont = rayon.querySelector('.produits-container');
      r.produits.forEach(p => {
        addProduit(cont, p.nom);
        const last = cont.lastChild;
        last.dataset.id = p.id;
        const cb = last.querySelector('.produit-checkbox');
        cb.checked = p.coche;
        last.classList.toggle('produit-coche', p.coche);
        cb.setAttribute('aria-checked', cb.checked);
      });

      rayonsContainer.appendChild(rayon);
    });
  } catch(err) { console.error("Erreur load API :", err); }
}

/* --- DRAG PC --- */
rayonsContainer.addEventListener('dragover', e => {
  e.preventDefault();
  const dragging = rayonsContainer.querySelector('.dragging');
  const after = getAfterElement(rayonsContainer, e.clientY);
  if (!after) rayonsContainer.appendChild(dragging);
  else rayonsContainer.insertBefore(dragging, after);
});
function getAfterElement(container, y) {
  return [...container.querySelectorAll('.rayon:not(.dragging)')]
    .reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height/2;
      if(offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/* --- DRAG MOBILE --- */
function initTouchDrag(rayon) {
  const btn = rayon.querySelector('.btn-deplacer-rayon');
  let isDragging = false;

  btn.addEventListener('touchstart', e => {
    if(e.touches.length !== 1) return;
    isDragging = true;
    rayon.classList.add('dragging');
    e.preventDefault();
  }, { passive:false });

  btn.addEventListener('touchmove', e => {
    if(!isDragging) return;
    const touchY = e.touches[0].clientY;
    const after = getAfterElement(rayonsContainer, touchY);
    if(!after) rayonsContainer.appendChild(rayon); else rayonsContainer.insertBefore(rayon, after);
    e.preventDefault();
  }, { passive:false });

  btn.addEventListener('touchend', () => {
    if(!isDragging) return;
    isDragging = false;
    rayon.classList.remove('dragging');
    save();
  });
}

/* --- INIT --- */
document.addEventListener('DOMContentLoaded', () => {
  load();
});
