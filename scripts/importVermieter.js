/**
 * Google Sheet → owners + inventory Import Script
 *
 * Erwartet Tabs:
 *  - source (SETTINGS.sourceSheet): CSV-Daten mit Spalten gemäß CSV-Objekt
 *  - owners
 *  - inventory
 */

var SETTINGS = {
  sourceSheet: 'import',
  ownersSheet: 'owners',
  inventorySheet: 'inventory'
};

var CSV = {
  ownerName: 'Vermieter-Name',
  website: 'Webseite',
  description: 'Beschreibung',
  changeLog: 'Change Log Time',
  locked: 'Locked',
  notes: 'Notizen',
  email: 'EMail',
  location: 'Standort',
  vehicles: 'Fahrzeuge',
  intlCustomers: 'Internationale Kunden',
  commission: 'wie viel Provision bekommen wir?',
  metroArea: 'Großstadt Raum',
  interactiveMap: 'Interaktive Karte',
  ranking: 'Vermieter Ranking A / B / C',
  phone: 'Telefon Nr.',
  experience: 'Erfahrung (in Jahre)'
};

function importFromSheet() {
  var ss = SpreadsheetApp.getActive();
  var source = sheetByName(ss, SETTINGS.sourceSheet);
  var ownersSheet = sheetByName(ss, SETTINGS.ownersSheet);
  var inventorySheet = sheetByName(ss, SETTINGS.inventorySheet);

  var values = source.getDataRange().getValues();
  if (values.length < 2) {
    throw new Error('Import-Tab enthält keine Daten');
  }

  var header = values[0];
  var dataRows = values.slice(1).filter(function (row) {
    return row.some(function (cell) { return cell !== '' && cell !== null; });
  });

  clearBody(ownersSheet);
  clearBody(inventorySheet);

  var ownersMap = {};
  var inventoryRows = [];

  dataRows.forEach(function (row) {
    var get = function (key) { return valueFromCsv(row, header, CSV[key]); };
    var name = get('ownerName');
    if (!name) return;

    var location = get('location');
    var city = parseCity(location);
    var baseNotes = combineFields([
      ['Beschreibung', get('description')],
      ['Notizen', get('notes')],
      ['Interaktive Karte', get('interactiveMap')]
    ]);
    var extraNotes = combineFields([
      ['Locked', get('locked')],
      ['Internationale Kunden', get('intlCustomers')]
    ]);

    var ownerKey = name.trim().toLowerCase();
    if (!ownersMap[ownerKey]) {
      ownersMap[ownerKey] = {
        vermieter_name: name,
        email: get('email'),
        telefon: normalizePhone(get('phone')),
        domain: normalizeDomain(get('website')),
        standort: location,
        stadt: city,
        grossstadt_raum: get('metroArea'),
        internationale_kunden: get('intlCustomers'),
        provision: get('commission'),
        ranking: get('ranking'),
        erfahrung_jahre: get('experience'),
        letzte_aenderung: formatDate(get('changeLog')),
        notizen: [baseNotes, extraNotes].filter(Boolean).join(' | ')
      };
    }

    var vehicleField = get('vehicles');
    if (!vehicleField) return;

    splitVehicles(vehicleField).forEach(function (vehicle) {
      inventoryRows.push({
        vermieter_name: name,
        fahrzeug_label: vehicle,
        fahrzeugtyp: guessVehicleType(vehicle),
        stadt: city,
        standort: location,
        land: 'Deutschland',
        status: 'aktiv',
        notizen: 'Quelle: Sheet-Import ' + formatDate(get('changeLog'))
      });
    });
  });

  writeObjects(ownersSheet, Object.keys(ownersMap).map(function (k) { return ownersMap[k]; }));
  writeObjects(inventorySheet, inventoryRows);

  SpreadsheetApp.getUi().alert(
    'Import abgeschlossen: ' + Object.keys(ownersMap).length + ' Vermieter, ' + inventoryRows.length + ' Fahrzeuge.'
  );
}

function sheetByName(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Tab "' + name + '" nicht gefunden');
  return sheet;
}

function clearBody(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
}

function valueFromCsv(row, header, label) {
  var idx = header.indexOf(label);
  if (idx === -1) return '';
  var value = row[idx];
  return value ? String(value).trim() : '';
}

function splitVehicles(field) {
  return String(field)
    .split(/\r?\n|;|,|•|·/)
    .map(function (line) { return line.replace(/["']/g, '').trim(); })
    .filter(function (line) { return line.length > 0; });
}

function normalizeDomain(url) {
  if (!url) return '';
  try {
    var cleaned = url.indexOf('http') === 0 ? url : 'https://' + url;
    return new URL(cleaned).hostname.replace(/^www\./, '');
  } catch (e) {
    return url;
  }
}

function normalizePhone(phone) {
  if (!phone) return '';
  var digits = String(phone).replace(/[^\d+]/g, '');
  return digits.indexOf('00') === 0 ? '+' + digits.slice(2) : digits;
}

function parseCity(location) {
  if (!location) return '';
  var first = String(location).split(/\n|;| \/ | {2,}/)[0] || location;
  var postal = /\b\d{4,5}\s+([A-Za-zÄÖÜäöüß\- ]+)/.exec(first);
  if (postal) return postal[1].trim();
  var segments = first.split(',');
  return (segments.pop() || '').trim();
}

function guessVehicleType(label) {
  var lower = String(label || '').toLowerCase();
  if (!lower) return '';
  if (lower.indexOf('g63') !== -1 || lower.indexOf('urus') !== -1 || lower.indexOf('x7') !== -1) return 'SUV';
  if (lower.indexOf('cabr') !== -1 || lower.indexOf('cab') !== -1) return 'Cabriolet';
  if (lower.indexOf('spyder') !== -1 || lower.indexOf('spider') !== -1 || lower.indexOf('huracan') !== -1) return 'Sportwagen';
  if (lower.indexOf('rs6') !== -1 || lower.indexOf('rs4') !== -1) return 'Kombi';
  if (lower.indexOf('panamera') !== -1 || lower.indexOf('aventador') !== -1 || lower.indexOf('bmw 7') !== -1) return 'Limousine';
  return '';
}

function formatDate(value) {
  if (!value) return '';
  var date = new Date(value);
  return isNaN(date.getTime()) ? '' : Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function combineFields(entries) {
  return entries
    .filter(function (entry) { return entry[1] && String(entry[1]).trim().length; })
    .map(function (entry) { return entry[0] + ': ' + String(entry[1]).trim(); })
    .join(' | ');
}

function writeObjects(sheet, rows) {
  if (!rows.length) return;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var data = rows.map(function (row) {
    return headers.map(function (key) { return row[key] || ''; });
  });
  sheet.getRange(2, 1, data.length, headers.length).setValues(data);
}
