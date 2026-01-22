export type Division = "WILD" | "AQUA" | "MARICULTURE";

export type InspectorInfo = {
  name: string;
  zone: string;
  id: string;
  divisionLabel: string;
};

export type CompletedInspection = {
  id: string;
  statusBadge: "Approved" | "Rejected";
  inspectedDate: string;
  tag?: string;
  title: string;
  farmer: string;
  quantity: string;
  waterTemp?: string;
  phLevel?: string;
  grade?: string;
  qualityGrade: string;
};

export type QualityDummyPayload = {
  inspector: InspectorInfo;
  totalInspections: number;
  completed: CompletedInspection[];
};

export const QUALITY_DUMMY: Record<Division, QualityDummyPayload> = {
  AQUA: {
    inspector: {
      name: "Ramesh Kumar",
      zone: "Nellore Zone",
      id: "INS-AQ-001",
      divisionLabel: "Aquaculture Division",
    },
    totalInspections: 156,
    completed: [
      {
        id: "AQ-C-001",
        statusBadge: "Approved",
        inspectedDate: "2024-12-08",
        title: "Sunrise Aqua Farm - Pond A1",
        farmer: "Kumar Rajan",
        quantity: "1800 kg",
        waterTemp: "28.5°C",
        phLevel: "7.8",
        grade: "30 Count",
        qualityGrade: "Grade A",
      },
      {
        id: "AQ-C-002",
        statusBadge: "Approved",
        inspectedDate: "2024-12-05",
        title: "Delta Aqua Farm - Pond B4",
        farmer: "Ravi Kumar",
        quantity: "1200 kg",
        waterTemp: "27.0°C",
        phLevel: "7.6",
        grade: "40 Count",
        qualityGrade: "Grade A",
      },
      {
        id: "AQ-C-003",
        statusBadge: "Rejected",
        inspectedDate: "2024-12-04",
        title: "River Pearl Farm - Pond C2",
        farmer: "Mani",
        quantity: "950 kg",
        waterTemp: "29.1°C",
        phLevel: "8.3",
        grade: "Soft Shell",
        qualityGrade: "Rejected",
      },
      {
        id: "AQ-C-004",
        statusBadge: "Approved",
        inspectedDate: "2024-12-02",
        title: "Ocean Fresh Farm - Pond D1",
        farmer: "Sathish",
        quantity: "2100 kg",
        waterTemp: "27.8°C",
        phLevel: "7.5",
        grade: "25 Count",
        qualityGrade: "Grade A",
      },
    ],
  },

  MARICULTURE: {
    inspector: {
      name: "Murugan Selvam",
      zone: "Ramanathapuram Zone",
      id: "INS-MR-001",
      divisionLabel: "Mariculture Division",
    },
    totalInspections: 89,
    completed: [
      {
        id: "MR-C-001",
        statusBadge: "Approved",
        inspectedDate: "2024-12-08",
        tag: "Sea Cage",
        title: "Blue Lagoon Farm - Cage Alpha",
        farmer: "Selvam Murugan",
        quantity: "450 kg",
        waterTemp: "27.5°C",
        phLevel: "7.9",
        grade: "Premium",
        qualityGrade: "Grade A",
      },
      {
        id: "MR-C-002",
        statusBadge: "Approved",
        inspectedDate: "2024-12-06",
        tag: "Sea Cage",
        title: "Pearl Coast Farm - Cage Beta",
        farmer: "Muthu Kumar",
        quantity: "520 kg",
        waterTemp: "27.2°C",
        phLevel: "7.8",
        grade: "Premium",
        qualityGrade: "Grade A",
      },
      {
        id: "MR-C-003",
        statusBadge: "Rejected",
        inspectedDate: "2024-12-03",
        tag: "Longline",
        title: "Coastal Seaweed Farm - Longline L2",
        farmer: "Rajesh",
        quantity: "680 kg",
        waterTemp: "28.0°C",
        phLevel: "8.2",
        grade: "Contamination",
        qualityGrade: "Rejected",
      },
      {
        id: "MR-C-004",
        statusBadge: "Approved",
        inspectedDate: "2024-12-01",
        tag: "Sea Cage",
        title: "Gulf Aqua Farm - Cage Gamma",
        farmer: "Prakash",
        quantity: "610 kg",
        waterTemp: "26.9°C",
        phLevel: "7.7",
        grade: "Premium",
        qualityGrade: "Grade A",
      },
    ],
  },

  WILD: {
    inspector: {
      name: "Arun Prakash",
      zone: "Chennai Zone",
      id: "INS-WD-001",
      divisionLabel: "Wild Capture Division",
    },
    totalInspections: 203,
    completed: [
      {
        id: "WD-C-001",
        statusBadge: "Approved",
        inspectedDate: "2024-12-09",
        tag: "Gillnet",
        title: "Kasimedu Landing - Lot K03",
        farmer: "Suresh",
        quantity: "840 kg",
        grade: "Fresh",
        qualityGrade: "Grade A",
      },
      {
        id: "WD-C-002",
        statusBadge: "Rejected",
        inspectedDate: "2024-12-08",
        tag: "Trawling",
        title: "Chennai Harbor - Lot W05",
        farmer: "Ramesh",
        quantity: "760 kg",
        grade: "Spoilage",
        qualityGrade: "Rejected",
      },
      {
        id: "WD-C-003",
        statusBadge: "Approved",
        inspectedDate: "2024-12-06",
        tag: "Hook & Line",
        title: "Nagapattinam Landing - Lot N07",
        farmer: "Kannan",
        quantity: "620 kg",
        grade: "Fresh",
        qualityGrade: "Grade A",
      },
      {
        id: "WD-C-004",
        statusBadge: "Approved",
        inspectedDate: "2024-12-04",
        tag: "Longline",
        title: "Chennai Harbor - Lot W11",
        farmer: "Aravind",
        quantity: "910 kg",
        grade: "Fresh",
        qualityGrade: "Grade A",
      },
    ],
  },
};
