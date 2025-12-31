/* =================================================
   CONSTANTES
================================================= */
const SHEET_RAYONS = "Rayons";
const SHEET_PRODUITS = "Produits";

/* =================================================
   API HTTP
================================================= */

// GET : renvoie toutes les données
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify(getData()))
    .setMimeType(ContentService.MimeType.JSON);
}

// POST : sauvegarde des données envoyées par le client
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    saveData(data);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: err.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/* =================================================
   LECTURE DES DONNÉES (Sheets → JS)
================================================= */
function getData() {
  // Récupération des feuilles 
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // des rayons et des produits
  const rayonsSheet = ss.getSheetByName(SHEET_RAYONS);
  const produitsSheet = ss.getSheetByName(SHEET_PRODUITS);

  if (!rayonsSheet || !produitsSheet) return [];

  const rayonsData = rayonsSheet
  // -1 to avoid errors when the sheet is empty
    .getRange(2, 1, Math.max(rayonsSheet.getLastRow() - 1, 0), 3)
    .getValues();
  
  const produitsData = produitsSheet
    .getRange(2, 1, Math.max(produitsSheet.getLastRow() - 1, 0), 4)
    .getValues();
  // Construction de la structure de données imbriquée
  return rayonsData.map(rayon => ({
    id: rayon[0],
    nom: rayon[1],
    collapsed: rayon[2],
    produits: produitsData
      .filter(p => p[1] === rayon[0])
      .map(p => ({
        id: p[0],
        nom: p[2],
        coche: p[3]
      }))
  }));
}

/* =================================================
   SAUVEGARDE DES DONNÉES (JS → Sheets)
================================================= */
function saveData(data) {
  // Récupération du classeur actif
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // Récupération (ou création) des feuilles
  let rayonsSheet = ss.getSheetByName(SHEET_RAYONS);
  let produitsSheet = ss.getSheetByName(SHEET_PRODUITS);
  // Création des feuilles si elles n'existent pas
  if (!rayonsSheet) rayonsSheet = ss.insertSheet(SHEET_RAYONS);
  if (!produitsSheet) produitsSheet = ss.insertSheet(SHEET_PRODUITS);
  // Nettoyage des feuilles avant sauvegarde
  rayonsSheet.clearContents();
  produitsSheet.clearContents();
  // Écriture des en-têtes de colonnes
  rayonsSheet
    .getRange(1, 1, 1, 3)
    .setValues([["id", "nom", "collapsed"]]);
  
  produitsSheet
    .getRange(1, 1, 1, 4)
    .setValues([["id", "rayonId", "nom", "coche"]]);
  // Préparation des données à écrire
  const rayonsValues = [];
  const produitsValues = [];
  // Remplissage des tableaux de valeurs
  data.forEach(rayon => {
    rayonsValues.push([rayon.id, rayon.nom, rayon.collapsed]);

    rayon.produits.forEach(prod => {
      produitsValues.push([
        prod.id,
        rayon.id,
        prod.nom,
        prod.coche
      ]);
    });
  });
  // Écriture des données dans les feuilles
  if (rayonsValues.length) {
    rayonsSheet
      .getRange(2, 1, rayonsValues.length, 3)
      .setValues(rayonsValues);
  }

  if (produitsValues.length) {
    produitsSheet
      .getRange(2, 1, produitsValues.length, 4)
      .setValues(produitsValues);
  }
}
