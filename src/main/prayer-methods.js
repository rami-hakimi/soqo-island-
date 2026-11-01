// Prayer-time calculation methods (PrayTimes parameters) and which one each country follows.
// fajr / isha: sun angle below the horizon, or isha as minutes after maghrib ("90 min");
// maghrib: an angle, or minutes after sunset (default: at sunset).
const METHODS = {
  MWL: { name: 'Muslim World League', fajr: 18, isha: 17 },
  ISNA: { name: 'Islamic Society of North America', fajr: 15, isha: 15 },
  EGYPT: { name: 'Egyptian General Authority of Survey', fajr: 19.5, isha: 17.5 },
  MAKKAH: { name: 'Umm Al-Qura University, Makkah', fajr: 18.5, isha: '90 min' },
  KARACHI: { name: 'University of Islamic Sciences, Karachi', fajr: 18, isha: 18 },
  TEHRAN: { name: 'Institute of Geophysics, Tehran', fajr: 17.7, isha: 14, maghrib: 4.5 },
  GULF: { name: 'Gulf Region', fajr: 19.5, isha: '90 min' },
  KUWAIT: { name: 'Kuwait', fajr: 18, isha: 17.5 },
  QATAR: { name: 'Qatar', fajr: 18, isha: '90 min' },
  SINGAPORE: { name: 'Majlis Ugama Islam Singapura', fajr: 20, isha: 18 },
  JAKIM: { name: 'JAKIM, Malaysia', fajr: 20, isha: 18 },
  KEMENAG: { name: 'Kemenag, Indonesia', fajr: 20, isha: 18 },
  FRANCE: { name: 'Union des Organisations Islamiques de France', fajr: 12, isha: 12 },
  TURKEY: { name: 'Diyanet, Turkey', fajr: 18, isha: 17 },
  RUSSIA: { name: 'Spiritual Administration of Muslims of Russia', fajr: 16, isha: 15 },
  DUBAI: { name: 'Dubai', fajr: 18.2, isha: 18.2, tune: { dhuhr: 3, maghrib: 3 } },
  TUNISIA: { name: 'Tunisia', fajr: 18, isha: 18 },
  ALGERIA: { name: 'Algeria', fajr: 18, isha: 17 },
  MOROCCO: { name: 'Morocco', fajr: 19, isha: 17 },
  JORDAN: { name: 'Ministry of Awqaf, Jordan', fajr: 18, isha: 18, maghrib: '5 min' },
};
const BY_COUNTRY = {
  EG: 'EGYPT', SD: 'EGYPT', LY: 'EGYPT', SY: 'EGYPT', LB: 'EGYPT', IQ: 'MWL',
  SA: 'MAKKAH', YE: 'MAKKAH', AE: 'DUBAI', KW: 'KUWAIT', QA: 'QATAR', BH: 'GULF', OM: 'GULF',
  JO: 'JORDAN', PS: 'JORDAN', MA: 'MOROCCO', DZ: 'ALGERIA', TN: 'TUNISIA', TR: 'TURKEY', IR: 'TEHRAN',
  PK: 'KARACHI', IN: 'KARACHI', BD: 'KARACHI', AF: 'KARACHI', SG: 'SINGAPORE', BN: 'SINGAPORE',
  MY: 'JAKIM', ID: 'KEMENAG', US: 'ISNA', CA: 'ISNA', FR: 'FRANCE', RU: 'RUSSIA',
};
// a location saved before countries were known: the country from its time zone
const ZONES = {
  'Africa/Cairo': 'EG', 'Asia/Riyadh': 'SA', 'Asia/Dubai': 'AE', 'Asia/Kuwait': 'KW', 'Asia/Qatar': 'QA', 'Asia/Bahrain': 'BH',
  'Asia/Muscat': 'OM', 'Asia/Amman': 'JO', 'Africa/Casablanca': 'MA', 'Africa/Algiers': 'DZ', 'Africa/Tunis': 'TN',
  'Europe/Istanbul': 'TR', 'Asia/Tehran': 'IR', 'Asia/Karachi': 'PK', 'Asia/Kolkata': 'IN', 'Asia/Dhaka': 'BD',
  'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Jakarta': 'ID', 'Europe/Paris': 'FR', 'Asia/Baghdad': 'IQ',
};
// the method for a location, or the one the user picked in Settings
function methodFor(loc, chosen = 'auto') {
  if (chosen !== 'auto' && METHODS[chosen]) return { key: chosen, ...METHODS[chosen] };
  const code = String(loc.country || '').toUpperCase();
  const country = /^[A-Z]{2}$/.test(code) ? code : ZONES[loc.timezone] || '';
  const key = BY_COUNTRY[country] || 'MWL';
  return { key, ...METHODS[key] };
}
module.exports = { METHODS, BY_COUNTRY, ZONES, methodFor };
