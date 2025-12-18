export type VesselOwner = {
  ownerId: string;
  ownerName: string;
  contactNumber: string;
  email: string;
  addressLine: string;
  kycStatus: string;
  linkedVesselIds: string[]; // list of vesselIds
};

export type Vessel = {
  vesselId: string;
  vesselName: string;
  registrationNo: string;
  vesselTypeCode: string; // C/M/O/D
  vesselTypeName: string; // Chennai/Mechanised/Motorised/Deep Sea (as per your sheet)
  vesselTypeNameTa?: string;
  homePortCode: string; // C/N/NA/T/R/K
  homePortName: string;
  homePortNameTa?: string;
  fishingLicenseNo: string;
  crewCapacityMax: number;
  storageCapacityKg: number;
  enginePowerHp: number;
  fuelType: string;
  ownerId: string;
  status: "Active" | "Inactive";
};

export const ownersDummy: VesselOwner[] = [
  {
    ownerId: "NA026829",
    ownerName: "Gowtham Sakthivel",
    contactNumber: "6374484558",
    email: "sgowtham2k1@gmail.com",
    addressLine:
      "1/198 Main Road Kuthalam, Gopurajapuram (Post), Kuthalam - 609703, Nagapattinam, Tamilnadu, India.",
    kycStatus: "Default (Verified)",
    linkedVesselIds: ["NAD00345"],
  },
];

export const vesselsDummy: Vessel[] = [
  {
    vesselId: "NAD00345",
    vesselName: "Nagai Kadal Arasan",
    registrationNo: "TN02T2756",
    vesselTypeCode: "D",
    vesselTypeName: "Deep Sea",
    vesselTypeNameTa: "ஆழ்கடல் கப்பல்",
    homePortCode: "NA",
    homePortName: "Akkaraipettai",
    homePortNameTa: "அக்கரைப்பேட்டை",
    fishingLicenseNo: "126783",
    crewCapacityMax: 16,
    storageCapacityKg: 1500,
    enginePowerHp: 15,
    fuelType: "Diesel",
    ownerId: "NA026829",
    status: "Active",
  },
];
