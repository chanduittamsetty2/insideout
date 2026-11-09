export interface Area {
  name: string;
  lat: number;
  lng: number;
}

export const AREAS: Area[] = [
  { name: "Secunderabad", lat: 17.4399, lng: 78.4983 },
  { name: "Begumpet", lat: 17.4447, lng: 78.4664 },
  { name: "Ameerpet", lat: 17.4375, lng: 78.4482 },
  { name: "Banjara Hills", lat: 17.4156, lng: 78.4347 },
  { name: "Jubilee Hills", lat: 17.4325, lng: 78.4071 },
  { name: "Madhapur", lat: 17.4483, lng: 78.3915 },
  { name: "Gachibowli", lat: 17.4401, lng: 78.3489 },
  { name: "Kondapur", lat: 17.4698, lng: 78.3577 },
  { name: "Kukatpally", lat: 17.4849, lng: 78.4138 },
  { name: "Tolichowki", lat: 17.3988, lng: 78.4146 },
  { name: "Himayatnagar", lat: 17.4022, lng: 78.4867 },
  { name: "Abids", lat: 17.392, lng: 78.476 },
  { name: "Charminar", lat: 17.3616, lng: 78.4747 },
];

export const areaByName = (name: string) => AREAS.find((a) => a.name === name) ?? AREAS[0];

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function nearestArea(lat: number, lng: number): string {
  return AREAS.reduce((best, a) => (distanceKm(a, { lat, lng }) < distanceKm(best, { lat, lng }) ? a : best)).name;
}
