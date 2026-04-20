export type DivisionKey = "wild" | "aqua" | "mariculture";
export type LangKey = "en" | "ta";

export type PackedStatus = "LOCAL" | "PENDING" | "SYNCED" | "FAILED";

export type PackedCrateItem = {
  id: string;
  code: string;
  division: DivisionKey;
  packed_at: string; // ISO
  packer_id: string;
  packer_name: string;
  status: PackedStatus;
  notes?: string;
};
