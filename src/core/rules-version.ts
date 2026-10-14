/** Frozen gameplay contract: reactions, Troubles, sky objects and pickups, Combo and flight parameters. */
export type RulesVersion = 1 | 2;
export const RULES_SUPPORTED: readonly RulesVersion[] = [1, 2];
export const RULES_LATEST: RulesVersion = 2;
/** Shipped play rules; only the gated flip PR changes this. */
export const RULES_VERSION: RulesVersion = 1;
