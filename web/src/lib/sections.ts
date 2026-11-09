import type { SectionKey } from "./types";

export interface SectionInfo {
  key: SectionKey;
  label: string;
  emoji: string;
  hint: string;
}

export const SECTIONS: SectionInfo[] = [
  { key: "kitchen", label: "Kitchen", emoji: "👨‍🍳", hint: "Stoves, prep counters, staff at work" },
  { key: "fridge", label: "Refrigerator", emoji: "🧊", hint: "Open the door. Show what's stored" },
  { key: "meat", label: "Meat storage", emoji: "🥩", hint: "Cold storage, labels, packaging" },
  { key: "veggies", label: "Vegetables", emoji: "🥬", hint: "Today's produce, washing area" },
  { key: "food", label: "Food items", emoji: "🍛", hint: "Dishes as they leave the kitchen" },
  { key: "dining", label: "Dining area", emoji: "🍽️", hint: "Tables, washrooms, wash basins" },
];

export const sectionInfo = (key: SectionKey) => SECTIONS.find((s) => s.key === key)!;

export const ALL_SECTIONS: SectionKey[] = SECTIONS.map((s) => s.key);
export const VEG_SECTIONS: SectionKey[] = ALL_SECTIONS.filter((k) => k !== "meat");
