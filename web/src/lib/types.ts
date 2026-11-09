export type SectionKey = "kitchen" | "fridge" | "meat" | "veggies" | "food" | "dining";

export type MediaKind = "photo" | "video";

export interface Media {
  id: string;
  section: SectionKey;
  kind: MediaKind;
  /** http(s) URL, or `idb:<id>` for media captured in this browser */
  src: string;
  /** Set by the system at upload time. Restaurants can never edit this. */
  capturedAt: number;
  caption?: string;
}

export interface Special {
  id: string;
  name: string;
  price: number;
  note?: string;
  image?: string;
  postedAt: number;
}

export interface Post {
  id: string;
  kind: "offer" | "event";
  title: string;
  detail?: string;
  postedAt: number;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  at: number;
}

export interface Fssai {
  number: string;
  type: "Central License" | "State License" | "Registration";
  validTill: string;
  verified: boolean;
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  cuisines: string[];
  area: string;
  address: string;
  phone: string;
  distanceKm: number;
  hours: { open: string; close: string };
  priceForTwo: number;
  isVeg: boolean;
  google: { rating: number; count: number; mapsUrl: string } | null;
  links: { swiggy?: string; zomato?: string };
  fssai: Fssai;
  cover: string;
  sections: SectionKey[];
  media: Media[];
  special?: Special;
  posts: Post[];
  reviews: Review[];
  stats: { profileViews: number; kitchenViews: number; qrScans: number; reviews: number };
  ownerEmail?: string;
  createdAt: number;
}
