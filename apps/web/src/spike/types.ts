/** Contrato de migración, espejo del `Migration` de apps/desktop/src/core/types.ts. */
export interface Migration {
  version: number
  up: string
}
