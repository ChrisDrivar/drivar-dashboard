type Coordinate = { latitude: number; longitude: number };

const cityCoordinates: Record<string, Coordinate> = {
  'de:berlin': { latitude: 52.520008, longitude: 13.404954 },
  'de:hamburg': { latitude: 53.551086, longitude: 9.993682 },
  'de:munchen': { latitude: 48.137154, longitude: 11.576124 },
  'de:münchen': { latitude: 48.137154, longitude: 11.576124 },
  'de:frankfurt': { latitude: 50.110924, longitude: 8.682127 },
  'de:frankfurt am main': { latitude: 50.110924, longitude: 8.682127 },
  'de:weiterstadt': { latitude: 49.903333, longitude: 8.5925 },
  'de:darmstadt': { latitude: 49.872825, longitude: 8.651192 },
  'de:recklinghausen': { latitude: 51.614064, longitude: 7.197949 },
  'de:karlsruhe': { latitude: 49.00689, longitude: 8.403653 },
  'de:mannheim': { latitude: 49.487459, longitude: 8.466039 },
  'de:essen': { latitude: 51.45657, longitude: 7.01228 },
  'de:rodgau': { latitude: 50.026908, longitude: 8.877219 },
  'de:braunschweig': { latitude: 52.268875, longitude: 10.526769 },
  'de:bremen': { latitude: 53.079296, longitude: 8.801694 },
  'de:mömbris': { latitude: 50.074264, longitude: 9.15739 },
  'de:moembris': { latitude: 50.074264, longitude: 9.15739 },
  'de:gunzburg': { latitude: 48.45276, longitude: 10.27364 },
  'de:günzburg': { latitude: 48.45276, longitude: 10.27364 },
  'de:beckum': { latitude: 51.755628, longitude: 8.040778 },
  'de:lippstadt': { latitude: 51.673858, longitude: 8.344886 },
  'de:münster': { latitude: 51.960665, longitude: 7.626135 },
  'de:munster': { latitude: 51.960665, longitude: 7.626135 },
  'de:stuttgart': { latitude: 48.775846, longitude: 9.182932 },
  'de:gelsenkirchen': { latitude: 51.517744, longitude: 7.085717 },
  'de:wernau': { latitude: 48.6959, longitude: 9.41761 },
  'de:albstadt': { latitude: 48.21408, longitude: 9.02344 },
  'de:norderstedt': { latitude: 53.7089, longitude: 9.99449 },
  'de:mainz': { latitude: 49.992862, longitude: 8.247253 },
  'de:siegburg': { latitude: 50.800596, longitude: 7.207531 },
  'de:duisburg': { latitude: 51.434407, longitude: 6.762329 },
  'de:heilbronn': { latitude: 49.142693, longitude: 9.210879 },
  'de:ludwigsburg': { latitude: 48.896435, longitude: 9.184904 },
  'de:anzing': { latitude: 48.15001, longitude: 11.85891 },
  'de:göttingen': { latitude: 51.54128, longitude: 9.9158 },
  'de:gottingen': { latitude: 51.54128, longitude: 9.9158 },
  'de:bad nenndorf': { latitude: 52.33771, longitude: 9.37581 },
  'de:koblenz': { latitude: 50.356943, longitude: 7.588995 },
  'de:kassel': { latitude: 51.312711, longitude: 9.479746 },
  'de:koln': { latitude: 50.937531, longitude: 6.960279 },
  'de:köln': { latitude: 50.937531, longitude: 6.960279 },
  'de:langenfeld': { latitude: 51.10819, longitude: 6.94716 },
  'de:schloss holte-stukenbrock': { latitude: 51.8939, longitude: 8.6175 },
  'de:schloß holte-stukenbrock': { latitude: 51.8939, longitude: 8.6175 },
  'de:bielefeld': { latitude: 52.030228, longitude: 8.532471 },
  'de:heidesheim': { latitude: 49.986, longitude: 8.1506 },
  'de:stuttgart-zuffenhausen': { latitude: 48.8329, longitude: 9.1619 },
  'de:munich': { latitude: 48.137154, longitude: 11.576124 },
  'de:magdeburg': { latitude: 52.120533, longitude: 11.627624 },
  'at:wien': { latitude: 48.208174, longitude: 16.373819 },
  'at:salzburg': { latitude: 47.80949, longitude: 13.05501 },
  'at:innsbruck': { latitude: 47.269212, longitude: 11.404102 },
  'at:kirchbichl': { latitude: 47.528, longitude: 12.067 },
  'at:leoben': { latitude: 47.384, longitude: 15.091 },
  'at:volders': { latitude: 47.283, longitude: 11.567 },
  'at:st andra': { latitude: 46.829, longitude: 15.271 },
  'at:st andrae': { latitude: 46.829, longitude: 15.271 },
  'at:st. andrä': { latitude: 46.829, longitude: 15.271 },
  'at:st. andra': { latitude: 46.829, longitude: 15.271 },
  'at:eitweg': { latitude: 46.809, longitude: 15.3 },
  'at:weiden am see': { latitude: 47.933, longitude: 16.87 },
  'ch:zürich': { latitude: 47.376887, longitude: 8.541694 },
  'ch:zurich': { latitude: 47.376887, longitude: 8.541694 },
  'ch:bern': { latitude: 46.947974, longitude: 7.447447 },
  'ch:geneva': { latitude: 46.204391, longitude: 6.143158 },
  'ch:basel': { latitude: 47.559599, longitude: 7.588576 },
  'ch:zug': { latitude: 47.166167, longitude: 8.515495 },
  'uk:london': { latitude: 51.507351, longitude: -0.127758 },
  'uk:manchester': { latitude: 53.480759, longitude: -2.242631 },
  'uk:birmingham': { latitude: 52.486243, longitude: -1.890401 },
  'uk:edinburgh': { latitude: 55.953251, longitude: -3.188267 },
  'uk:glasgow': { latitude: 55.864237, longitude: -4.251806 },
  'us:new york': { latitude: 40.712776, longitude: -74.005974 },
  'us:los angeles': { latitude: 34.052235, longitude: -118.243683 },
  'us:miami': { latitude: 25.761681, longitude: -80.191788 },
  'us:san francisco': { latitude: 37.774929, longitude: -122.419418 },
  'us:las vegas': { latitude: 36.169941, longitude: -115.139832 },
  'ae:dubai': { latitude: 25.204849, longitude: 55.270782 },
  'ae:abu dhabi': { latitude: 24.453884, longitude: 54.3773438 },
  'au:sydney': { latitude: -33.86882, longitude: 151.209296 },
  'au:melbourne': { latitude: -37.813629, longitude: 144.963058 },
  'au:brisbane': { latitude: -27.469771, longitude: 153.025124 },
};

export const normaliseLand = (land: string) => {
  const value = land.trim().toLowerCase();
  if (value.includes('deutsch')) return 'de';
  if (value.includes('germany')) return 'de';
  if (value.includes('austria') || value.includes('österreich')) return 'at';
  if (value.includes('schweiz') || value.includes('switzerland')) return 'ch';
  if (value.includes('united kingdom') || value.includes('uk')) return 'uk';
  if (value.includes('united arab emirates') || value.includes('uae')) return 'ae';
  if (value.includes('australien') || value.includes('australia')) return 'au';
  if (value.includes('usa') || value.includes('vereinigte staaten') || value.includes('united states'))
    return 'us';
  return value.slice(0, 2);
};

const normaliseCity = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function resolveCityCoordinates(city: string, land: string): Coordinate | undefined {
  if (!city) return undefined;
  const key = `${normaliseLand(land)}:${normaliseCity(city)}`;
  return cityCoordinates[key];
}
