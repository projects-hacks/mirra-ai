/**
 * Constants and enums for closet-related functionality
 * These should match the backend constants in backend/app/core/closet_constants.py
 */

export enum ClothingCategory {
  JACKET = "jacket",
  COAT = "coat",
  BLAZER = "blazer",
  TOP = "top",
  SHIRT = "shirt",
  BLOUSE = "blouse",
  SWEATER = "sweater",
  DRESS = "dress",
  SKIRT = "skirt",
  PANTS = "pants",
  JEANS = "jeans",
  SHORTS = "shorts",
  SHOES = "shoes",
  SNEAKERS = "sneakers",
  BOOTS = "boots",
  BAG = "bag",
  ACCESSORY = "accessory",
  JEWELRY = "jewelry",
  HAT = "hat",
  SCARF = "scarf",
  BELT = "belt",
}

export enum Occasion {
  CASUAL = "casual",
  WORK = "work",
  DATE = "date",
  FORMAL = "formal",
  ATHLETIC = "athletic",
  PARTY = "party",
}

export enum Season {
  SPRING = "spring",
  SUMMER = "summer",
  FALL = "fall",
  WINTER = "winter",
}

// Constants
export const FORMALITY_MIN = 0.0;
export const FORMALITY_MAX = 1.0;
export const FORMALITY_DEFAULT = 0.5;

// Helper functions
export function getAllCategories(): string[] {
  return Object.values(ClothingCategory);
}

export function getAllOccasions(): string[] {
  return Object.values(Occasion);
}

export function getAllSeasons(): string[] {
  return Object.values(Season);
}

