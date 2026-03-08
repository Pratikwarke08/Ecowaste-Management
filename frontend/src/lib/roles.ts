export type UserRole =
  | "collector"
  | "employee"
  | "recycling_logistics"
  | "waste_buyer"
  | "government_officer"
  | "carbon_auditor";

export const roleLabel: Record<UserRole, string> = {
  collector: "Collector",
  employee: "Employee",
  recycling_logistics: "Recycling Logistics",
  waste_buyer: "Waste Buyer",
  government_officer: "Government Officer",
  carbon_auditor: "Carbon Auditor",
};
