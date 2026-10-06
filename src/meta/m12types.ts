/** Stable App Store product metadata shared by the M12 packages. */
export type ProductKind = 'gem_pack' | 'piggy_bank' | 'cosmetic_bundle' | 'road_pass' | 'theme' | 'planet_pack' | 'style_single';

export interface ProductDef {
  key: string;
  /** Permanent Apple product identifier. */
  id: string;
  kind: ProductKind;
  title: string;
  description: string;
  contents: string[];
  emoji: string;
  /** Fixed amount for a gem pack; zero for cosmetic products. */
  gems: number;
  /** Fixed cosmetic IDs; an empty array for gem products. */
  cosmeticItemIds: string[];
  consumable: boolean;
  familySharing: boolean;
  /** USD display fallback; StoreKit's localized price takes precedence. */
  fallbackPrice: string;
}

/** Reversible visual draft. Slot keys are defined by the Styles package. */
export interface StyleSelection<Slot extends string = string> {
  slots: Partial<Record<Slot, string>>;
}

/** A themed seven-stop Voyage with a fixed final cosmetic reward. */
export interface WeeklyTheme {
  id: string;
  name: string;
  /** One deterministic variant for each of the seven Voyage stops. */
  stopVariants: readonly [string, string, string, string, string, string, string];
  finalLookId: string;
}
