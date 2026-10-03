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

function compatibleDonorGroupsFor(recipientBloodGroup) {
  return RECIPIENT_COMPATIBLE_DONORS[recipientBloodGroup] || [];
}

module.exports = { RECIPIENT_COMPATIBLE_DONORS, compatibleDonorGroupsFor };
