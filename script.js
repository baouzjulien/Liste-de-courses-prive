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
  saveLocal();
  saveServer();
});
nomRayonInput.addEventListener('keydown', e => { if(e.key==='Enter') ajouterRayonBtn.click(); });

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

  // Repli / dépli
  header.addEventListener('click', e => {
    if(e.target.closest('button')) return;
    rayon.classList.toggle('collapsed');
    saveLocal();
    saveServer();
  });

  // Supprimer / modifier rayon
  btnSup.addEventListener('click', () => { rayon.remove(); saveLocal(); saveServer(); });
  btnMod.addEventListener('click', () => {
    const titre = rayon.querySelector('h2');
    const nv = prompt("Nouveau nom:", titre.firstChild.textContent.trim());
    if(nv) { titre.firstChild.textContent = nv + ' '; saveLocal(); saveServer(); }
  });

  // Ajouter produit
  inputProd.addEventListener('keydown', e => {
    if(e.key==='Enter') {
      const val = inputProd.value.trim();
      if(!val) return;
      addProduit(contProd, val);
      inputProd.value = '';
      saveLocal();
      saveServer();
    }
  });

  // Drag PC
  rayon.addEventListener('dragstart', () => rayon.classList.add('dragging'));
  rayon.addEventListener('dragend', () => { rayon.classList.remove('dragging'); saveLocal(); saveServer(); });

  btnDrag.addEventListener('mousedown', () => rayon.setAttribute('draggable', 'true'));
  ['mouseup','mouseleave'].forEach(evt => btnDrag.addEventListener(evt, ()=>rayon.removeAttribute('draggable')));
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
    if(e.target.closest('button')) return;
    e.stopPropagation();
    container.querySelectorAll('.produit-actions').forEach(act => {
      if(act !== p.querySelector('.produit-actions')) act.style.display = 'none';
    });
    p.querySelector('.produit-actions').style.display = 'inline-block';
  });

  cb.addEventListener('change', () => {
    cb.setAttribute('aria-checked', cb.checked);
    p.classList.toggle('produit-coche', cb.checked);
    if(cb.checked) container.appendChild(p); else container.prepend(p);
    saveLocal(); saveServer();
  });

  btnSup.addEventListener('click', () => { p.remove(); saveLocal(); saveServer(); });
  btnMod.addEventListener('click', () => {
    const nv = prompt("Nouveau nom:", nomSpan.textContent);
    if(nv) { nomSpan.textContent = nv; saveLocal(); saveServer(); }
  });

  container.appendChild(p);
}

/* --- LOCAL STORAGE --- */
function saveLocal() {
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
  localStorage.setItem('listeCourses', JSON.stringify(data));
}

function loadLocal() {
  const saved = localStorage.getItem('listeCourses');
  if(!saved) return;
  const data = JSON.parse(saved);
  rayonsContainer.innerHTML = "";
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
}

/* --- API --- */
async function saveServer() {
  try { 
    const data = JSON.parse(localStorage.getItem('listeCourses') || "[]");
    await fetch(API_URL, { method:'POST', body: JSON.stringify(data) });
  } catch(err){ console.error("Erreur save API:", err);}
}

/* --- SYNC --- */
async function syncLoop() {
  try {
    const res = await fetch(`${API_URL}?ping=1`);
    const data = await res.json();
    const timestamp = data.updated;
    if(timestamp !== lastUpdate){
      lastUpdate = timestamp;
      loadServer();
    }
  } catch(err){ console.error("Erreur sync:", err);}
  finally { setTimeout(syncLoop, 2000); }
}

async function loadServer() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    localStorage.setItem('listeCourses', JSON.stringify(data));
    loadLocal();
  } catch(err){ console.error("Erreur load API:", err);}
}

/* --- INIT --- */
let lastUpdate = 0;
document.addEventListener('DOMContentLoaded', () => {
  loadLocal();   // Chargement local immédiat
  syncLoop();    // Long-polling serveur
});
