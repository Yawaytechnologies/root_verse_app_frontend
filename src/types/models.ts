export type CrateStatus =
  | "RECEIVED_AT_CENTRE"
  | "SCHEDULED_FOR_DISPATCH"
  | "IN_TRANSIT"
  | "DELIVERED";

export type Crate = {
  id: number;
  qrId: number;
  crateCode?: string;

  status: CrateStatus;
  custody: "CENTRE" | "TRANSPORT" | "DESTINATION";

  assignedTransportOperatorId?: number;
};