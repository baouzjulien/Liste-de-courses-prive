const API_URL = "https://script.google.com/macros/s/AKfycbyt1rnaburyDKblXGC0BUKh6-1JLtGcOhxrZiNe8Bye09enlV_EU7_37WHFz4Ymo8_W/exec";

const rayonsContainer = document.getElementById('rayons-container');
const ajouterRayonBtn = document.getElementById('btn-ajouter-rayon');
const nomRayonInput = document.getElementById('nouveau-rayon');

let localData = [];
let lastUpdate = 0;

/* --- AJOUT RAYON --- */
ajouterRayonBtn.addEventListener('click', () => {
  const nom = nomRayonInput.value.trim();
  if (!nom) return;
  const rayon = createRayon(nom);
  rayonsContainer.appendChild(rayon);
  nomRayonInput.value = '';
  updateLocalData();
});

/* --- ENTER POUR AJOUTER --- */
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

  header.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    rayon.classList.toggle('collapsed');
    // attendre que le DOM ait appliqué la classe
    requestAnimationFrame(updateLocalData);
  });

  btnSup.addEventListener('click', () => { rayon.remove(); updateLocalData(); });
  btnMod.addEventListener('click', () => {
    const titre = rayon.querySelector('h2');
    const nv = prompt("Nouveau nom:", titre.textContent.trim());
    if (nv) { titre.textContent = nv; updateLocalData(); }
  });

  inputProd.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = inputProd.value.trim();
      if (!val) return;
      addProduit(contProd, val);
      inputProd.value = '';
      updateLocalData();
    }
  });

  rayon.addEventListener('dragstart', () => rayon.classList.add('dragging'));
  rayon.addEventListener('dragend', () => { rayon.classList.remove('dragging'); updateLocalData(); });

  btnDrag.addEventListener('mousedown', () => rayon.setAttribute('draggable', 'true'));
  ['mouseup','mouseleave'].forEach(evt => btnDrag.addEventListener(evt, () => rayon.removeAttribute('draggable')));
}

/* --- PRODUIT --- */
function addProduit(container, nom, id=null, coche=false) {
  const p = document.createElement('div');
  p.className = 'produit';
  p.dataset.id = id || crypto.randomUUID();

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

  cb.checked = coche;
  p.classList.toggle('produit-coche', coche);
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
    updateLocalData();
  });

  btnSup.addEventListener('click', () => { p.remove(); updateLocalData(); });
  btnMod.addEventListener('click', () => {
    const nv = prompt("Nouveau nom:", nomSpan.textContent);
    if (nv) { nomSpan.textContent = nv; updateLocalData(); }
  });

  container.appendChild(p);
}

/* --- LOCALSTORAGE + API SYNC --- */
function updateLocalData() {
  localData = [];
  rayonsContainer.querySelectorAll('.rayon').forEach(rayon => {
    const nom = rayon.querySelector('h2').textContent.trim();
    const collapsed = rayon.classList.contains('collapsed');
    const produits = [];
    rayon.querySelectorAll('.produit').forEach(p => {
      produits.push({
        id: p.dataset.id,
        nom: p.querySelector('.produit-nom').textContent,
        coche: p.querySelector('.produit-checkbox').checked
      });
    });
    localData.push({ id: rayon.dataset.id, nom, collapsed, produits });
  });

  localStorage.setItem('listeCourses', JSON.stringify(localData));
  saveToServer(localData);
}

/* --- SAVE API --- */
async function saveToServer(data) {
  try {
    await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
  } catch(err) { console.error("Erreur save API :", err); }
}

/* --- LOAD LOCAL STORAGE --- */
function loadFromLocal() {
  const saved = localStorage.getItem('listeCourses');
  if (!saved) return false;
  const data = JSON.parse(saved);
  rebuildFromData(data);
  return true;
}

/* --- LOAD SERVER --- */
async function loadFromServer() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    rebuildFromData(data);
  } catch(err) { console.error("Erreur load API :", err); }
}

/* --- REBUILD DOM --- */
function rebuildFromData(data) {
  rayonsContainer.innerHTML = "";
  data.forEach(r => {
    const rayon = createRayon(r.nom);
    rayon.dataset.id = r.id;
    rayon.classList.toggle('collapsed', r.collapsed);

    const cont = rayon.querySelector('.produits-container');
    r.produits.forEach(p => addProduit(cont, p.nom, p.id, p.coche));

    rayonsContainer.appendChild(rayon);
  });
  localData = data;
  localStorage.setItem('listeCourses', JSON.stringify(localData));
}

/* --- SYNC LONG-POLLING --- */
async function syncLoop() {
  try {
    const res = await fetch(`${API_URL}?ping=1`);
    const data = await res.json();
    const timestamp = data.updated;
    if(timestamp !== lastUpdate) {
      lastUpdate = timestamp;
      await loadFromServer();
    }
  } catch(err) { console.error("Erreur sync :", err); }
  finally { setTimeout(syncLoop, 2000); }
}

/* --- INIT DRAG PC --- */
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

/* --- INIT DRAG MOBILE --- */
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
    if(!after) rayonsContainer.appendChild(rayon);
    else rayonsContainer.insertBefore(rayon, after);
    e.preventDefault();
  }, { passive:false });

  btn.addEventListener('touchend', () => {
    if(!isDragging) return;
    isDragging = false;
    rayon.classList.remove('dragging');
    updateLocalData();
  });
}

/* --- INIT --- */
document.addEventListener('DOMContentLoaded', () => {
  const loaded = loadFromLocal();
  if(!loaded) loadFromServer();
  syncLoop();
});
