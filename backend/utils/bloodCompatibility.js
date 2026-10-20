// Standard red-cell donor/recipient compatibility chart.
// Key: recipient blood group -> list of donor blood groups they can safely receive from.
const RECIPIENT_COMPATIBLE_DONORS = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

// v1.9: blood components. The blood bank always makes the final call; these
// are deliberately conservative matching rules.
const COMPONENTS = ["Whole blood", "Platelets", "Plasma"];

// Plasma follows the OPPOSITE ABO rule to red cells (AB plasma suits everyone)
// and the Rh sign doesn't matter. Key: recipient ABO type -> donor ABO types.
const PLASMA_DONOR_ABO = { O: ["O", "A", "B", "AB"], A: ["A", "AB"], B: ["B", "AB"], AB: ["AB"] };
const ABO_OF = (g) => String(g || "").replace(/[+-]$/, "");

function compatibleDonorGroupsFor(recipientBloodGroup, component = "Whole blood") {
  if (component === "Platelets") {
    // Platelets are usually asked for as "same group": match the exact group.
    return RECIPIENT_COMPATIBLE_DONORS[recipientBloodGroup] ? [recipientBloodGroup] : [];
  }
  if (component === "Plasma") {
    const abo = PLASMA_DONOR_ABO[ABO_OF(recipientBloodGroup)];
    return abo ? abo.flatMap((t) => [`${t}+`, `${t}-`]) : [];
  }
  return RECIPIENT_COMPATIBLE_DONORS[recipientBloodGroup] || [];
}

module.exports = { RECIPIENT_COMPATIBLE_DONORS, COMPONENTS, compatibleDonorGroupsFor };
