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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rayonsSheet = ss.getSheetByName(SHEET_RAYONS);
  const produitsSheet = ss.getSheetByName(SHEET_PRODUITS);

  if (!rayonsSheet || !produitsSheet) return [];

  const rayonsData = rayonsSheet
    .getRange(2, 1, Math.max(rayonsSheet.getLastRow() - 1, 0), 3)
    .getValues();

  const produitsData = produitsSheet
    .getRange(2, 1, Math.max(produitsSheet.getLastRow() - 1, 0), 4)
    .getValues();

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
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let rayonsSheet = ss.getSheetByName(SHEET_RAYONS);
  let produitsSheet = ss.getSheetByName(SHEET_PRODUITS);

  if (!rayonsSheet) rayonsSheet = ss.insertSheet(SHEET_RAYONS);
  if (!produitsSheet) produitsSheet = ss.insertSheet(SHEET_PRODUITS);

  rayonsSheet.clearContents();
  produitsSheet.clearContents();

  rayonsSheet
    .getRange(1, 1, 1, 3)
    .setValues([["id", "nom", "collapsed"]]);

  produitsSheet
    .getRange(1, 1, 1, 4)
    .setValues([["id", "rayonId", "nom", "coche"]]);

  const rayonsValues = [];
  const produitsValues = [];

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
