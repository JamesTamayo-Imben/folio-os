import { adminCollection } from "./adminCrud";
import { applicationFromRow, applicationToRow } from "./applicationsRepo";
import { referenceFromRow, referenceToRow } from "./referencesRepo";
import { applicationInputSchema, referenceInputSchema } from "./validation";

export const references = adminCollection({
  label: "reference",
  table: "references_list",
  schema: referenceInputSchema,
  toRow: referenceToRow,
  fromRow: referenceFromRow,
  order: [{ column: "sort_order", ascending: true }, { column: "created_at", ascending: true }],
  revalidate: true,
});

export const applications = adminCollection({
  label: "application",
  table: "applications",
  schema: applicationInputSchema,
  toRow: applicationToRow,
  fromRow: applicationFromRow,
  order: [{ column: "created_at", ascending: false }],
  conflictField: "slug",
});
