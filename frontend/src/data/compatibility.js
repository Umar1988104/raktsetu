// Which donor groups can give red-cell blood to each recipient group.
// MIRRORS backend/utils/bloodCompatibility.js (RECIPIENT_COMPATIBLE_DONORS) —
// keep the two in sync. The blood bank always makes the final decision.
export const RECIPIENT_COMPATIBLE_DONORS = {
  "A+": ["O-", "O+", "A-", "A+"],
  "A-": ["O-", "A-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "B-": ["O-", "B-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "O+": ["O-", "O+"],
  "O-": ["O-"],
};
export const GROUPS = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
export const canGiveTo = (donor) => GROUPS.filter((r) => RECIPIENT_COMPATIBLE_DONORS[r].includes(donor));
export const canReceiveFrom = (recipient) => RECIPIENT_COMPATIBLE_DONORS[recipient];
