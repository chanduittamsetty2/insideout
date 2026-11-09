export type SectionKey = "kitchen" | "fridge" | "meat" | "veggies" | "food" | "dining";

export type MediaKind = "photo" | "video";

export type RestaurantStatus = "draft" | "live" | "suspended";

export interface Media {
  id: string;
  section: SectionKey;
  kind: MediaKind;
  /** Public URL */
  src: string;
  /** Set by the database at upload time. Restaurants can never edit this. */
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

export interface Stats {
  profileViews: number;
  kitchenViews: number;
  qrScans: number;
  reviews: number;
}

export interface Restaurant {
  id: string;
  slug: string;
  status: RestaurantStatus;
  isDemo: boolean;
  name: string;
  tagline: string;
  cuisines: string[];
  area: string;
  address: string;
  phone: string;
  lat: number | null;
  lng: number | null;
  /** Distance from the customer's selected area. Filled in by the store. */
  distanceKm: number;
  hours: { open: string; close: string };
  priceForTwo: number;
  isVeg: boolean;
  google: { rating: number; count: number; mapsUrl: string } | null;
  links: { swiggy?: string; zomato?: string };
  fssai: Fssai | null;
  cover: string;
  sections: SectionKey[];
  media: Media[];
  special?: Special;
  posts: Post[];
  reviews: Review[];
  createdAt: number;
}
