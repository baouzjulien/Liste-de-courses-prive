/* =================================================
   CONSTANTES
================================================= */
const API_URL = "https://script.google.com/macros/s/AKfycbyt1rnaburyDKblXGC0BUKh6-1JLtGcOhxrZiNe8Bye09enlV_EU7_37WHFz4Ymo8_W/exec";
const rayonsContainer = document.getElementById('rayons-container');
const ajouterRayonBtn = document.getElementById('btn-ajouter-rayon');
const nomRayonInput = document.getElementById('nouveau-rayon');

let localData = [];

/* =================================================
   UTILITAIRES
================================================= */
function debounce(fn, delay = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function normalize(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/* =================================================
   INLINE EDIT (produits + rayons)
================================================= */
function enableInlineEdit(el, onSave) {
  let original = "";
  let editing = false;

  el.addEventListener('dblclick', e => {
    e.stopPropagation();
    if (editing) return;

    editing = true;
    original = el.textContent;

    el.setAttribute('contenteditable', 'true');
    el.focus();

    const r = document.createRange();
    r.selectNodeContents(el);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  });

  el.addEventListener('keydown', e => {
    if (!editing) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      el.blur();
    }
    if (e.key === 'Escape') {
      el.textContent = original;
      el.blur();
    }
  });

  el.addEventListener('blur', () => {
    if (!editing) return;
    editing = false;
    el.removeAttribute('contenteditable');

    const val = el.textContent.trim();
    if (val && val !== original) onSave(val);
    else el.textContent = original;

    updateLocalStorage();
  });
}

/* =================================================
   SAUVEGARDE
================================================= */
function updateLocalStorage() {
  localStorage.setItem('listeCourses', JSON.stringify(localData));
  debounceSaveServer();
}

let saveTimeout = null;
function debounceSaveServer(delay = 1000) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveToServer(localData), delay);
}

async function saveToServer(data) {
  try {
    await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
  } catch {}
}

/* =================================================
   AUTOCOMPLÉTION
================================================= */
function findMatch(value, rayonId) {
  const v = normalize(value);
  const local = localData.find(r => r.id === rayonId);
  if (local) {
    const m = local.produits.find(p => normalize(p.nom).startsWith(v));
    if (m) return m;
  }
  for (const r of localData) {
    const m = r.produits.find(p => normalize(p.nom).startsWith(v));
    if (m) return m;
  }
  return null;
}

/* =================================================
   DOM
================================================= */
function rebuildDOM() {
  rayonsContainer.innerHTML = "";
  localData.forEach(r => {
    const rayon = createRayon(r);
    rayonsContainer.appendChild(rayon);
  });
}

/* =================================================
   RAYON
================================================= */
function createRayon(r) {
  const el = document.createElement('div');
  el.className = 'rayon';
  el.dataset.id = r.id;
  el.draggable = true;

  el.innerHTML = `
    <div class="rayon-header">
      <span class="rayon-drag">☰</span>
      <h2>${r.nom}</h2>
      <div class="rayon-actions">
        <button class="btn-supprimer-rayon"></button>
      </div>
    </div>
    <div class="rayon-content"></div>
    <div class="add-produit">
      <input type="text" class="nouveau-produit" placeholder="Ajouter un produit">
    </div>
  `;

  if (r.collapsed) el.classList.add('collapsed');

  const content = el.querySelector('.rayon-content');
  r.produits
    .slice()
    .sort((a, b) => a.coche - b.coche)
    .forEach(p => content.appendChild(createProduit(p, r)));

  initRayon(el, r);
  return el;
}

function initRayon(el, r) {
  const header = el.querySelector('.rayon-header');
  const title = el.querySelector('h2');
  const input = el.querySelector('.nouveau-produit');
  const actions = el.querySelector('.rayon-actions');

  header.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    el.classList.toggle('collapsed');
    r.collapsed = el.classList.contains('collapsed');
    updateLocalStorage();
    actions.classList.add('show');
  });

  enableInlineEdit(title, nv => r.nom = nv);

  el.querySelector('.btn-supprimer-rayon').onclick = () => {
    localData = localData.filter(x => x.id !== r.id);
    el.remove();
    updateLocalStorage();
  };

  let lastSuggestion = null;
  input.addEventListener('input', debounce(() => {
    const v = input.value;
    if (!v) return;
    const m = findMatch(v, r.id);
    if (!m) return;
    lastSuggestion = m.nom;
    input.value = m.nom;
    input.setSelectionRange(v.length, m.nom.length);
  }));

  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const v = input.value.trim();
    if (!v) return;

    if (r.produits.some(p => normalize(p.nom) === normalize(v))) {
      input.value = '';
      lastSuggestion = null;
      return;
    }

    const p = { id: crypto.randomUUID(), nom: v, coche: false };
    r.produits.push(p);
    el.querySelector('.rayon-content').appendChild(createProduit(p, r));
    input.value = '';
    lastSuggestion = null;
    updateLocalStorage();
  });
}

/* =================================================
   PRODUIT
================================================= */
function createProduit(p, r) {
  const el = document.createElement('div');
  el.className = 'produit';
  el.dataset.id = p.id;

  el.innerHTML = `
    <input type="checkbox" class="produit-checkbox">
    <span class="produit-nom">${p.nom}</span>
    <div class="produit-actions">
      <button class="btn-supprimer-produit"></button>
    </div>
  `;

  const cb = el.querySelector('.produit-checkbox');
  const name = el.querySelector('.produit-nom');
  const actions = el.querySelector('.produit-actions');

  cb.checked = p.coche;
  el.classList.toggle('checked', p.coche);

  cb.onchange = () => {
    p.coche = cb.checked;
    el.classList.toggle('checked', cb.checked);
    r.produits.sort((a,b)=>a.coche-b.coche);
    r.produits.forEach(pr=>{
      const pe = el.parentElement.querySelector(`[data-id="${pr.id}"]`);
      pe && el.parentElement.appendChild(pe);
    });
    updateLocalStorage();
  };

  el.onclick = () => actions.classList.add('show');

  enableInlineEdit(name, nv => p.nom = nv);

  el.querySelector('.btn-supprimer-produit').onclick = () => {
    r.produits = r.produits.filter(x => x.id !== p.id);
    el.remove();
    updateLocalStorage();
  };

  return el;
}

/* =================================================
   DRAG & DROP
================================================= */
rayonsContainer.addEventListener('dragstart', e => {
  const r = e.target.closest('.rayon');
  if (!r) return;
  r.classList.add('dragging');
});

rayonsContainer.addEventListener('dragend', e => {
  const r = e.target.closest('.rayon');
  if (!r) return;
  r.classList.remove('dragging');
  const order = [...rayonsContainer.children].map(x => x.dataset.id);
  localData.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
  updateLocalStorage();
});

rayonsContainer.addEventListener('dragover', e => {
  e.preventDefault();
  const dragging = document.querySelector('.dragging');
  const after = [...rayonsContainer.children]
    .find(r => e.clientY < r.getBoundingClientRect().top + r.offsetHeight/2);
  after ? rayonsContainer.insertBefore(dragging, after)
        : rayonsContainer.appendChild(dragging);
});

/* =================================================
   INIT
================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('listeCourses');
  if (saved) {
    localData = JSON.parse(saved);
    rebuildDOM();
  }
});

ajouterRayonBtn.onclick = () => {
  const v = nomRayonInput.value.trim();
  if (!v) return;
  localData.push({ id: crypto.randomUUID(), nom: v, collapsed: false, produits: [] });
  rebuildDOM();
  nomRayonInput.value = '';
  updateLocalStorage();
};
