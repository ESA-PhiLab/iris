/**
 * Coordinate reference systems of the images
 *
 * UTM, WGS 84 and Web Mercator are known right away. Any other EPSG code is
 * looked up in the EPSG database (309 kB), loaded only when needed.
 */

import proj4 from 'proj4';
import loadEPSG from '@developmentseed/epsg/all';
import epsgDatabaseUrl from '@developmentseed/epsg/all.csv.gz?url';

/** proj4 definition of WGS 84 / UTM, or null for other codes */
export const utmDefinition = (epsg: number): string | null => {
  const north = epsg >= 32601 && epsg <= 32660;
  const south = epsg >= 32701 && epsg <= 32760;
  if (!north && !south) return null;
  const zone = epsg % 100;
  return `+proj=utm +zone=${zone}${south ? ' +south' : ''} +datum=WGS84 +units=m +no_defs`;
};

export const crsDefinition = async (epsg: number): Promise<string> => {
  if (epsg === 4326) return 'EPSG:4326';
  if (epsg === 3857 || epsg === 900913) return 'EPSG:3857';
  const utm = utmDefinition(epsg);
  if (utm) return utm;

  const database = await loadEPSG(epsgDatabaseUrl);
  const wkt = database.get(epsg);
  if (!wkt) throw new Error(`Unknown coordinate reference system EPSG:${epsg}`);
  return wkt;
};

/** Convert points of a CRS to [longitude, latitude] */
export const toLngLat = async (epsg: number, points: Array<[number, number]>) => {
  const converter = proj4(await crsDefinition(epsg), 'EPSG:4326');
  return points.map((point) => converter.forward(point) as [number, number]);
};
