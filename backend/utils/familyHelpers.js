// A Donor profile belongs to a User account, but may represent a family
// member of that account rather than the account holder themself. This
// resolves the right name/phone/relation to actually show, wherever a
// donor's identity is displayed (browse list, matches, notifications).
// `userDoc` must have `familyMembers` loaded (not just name/phone/email).
function resolveDonorContact(donorDoc, userDoc) {
  if (donorDoc.familyMemberId && userDoc?.familyMembers?.length) {
    const fm = userDoc.familyMembers.find((m) => String(m._id) === String(donorDoc.familyMemberId));
    if (fm) {
      return {
        name: fm.name,
        phone: fm.phone || userDoc.phone, // fall back to the account holder's phone if the family member has none on file
        email: userDoc.email,
        relation: fm.relation || null,
        isFamilyMember: true,
      };
    }
  }
  return { name: userDoc?.name, phone: userDoc?.phone, email: userDoc?.email, relation: null, isFamilyMember: false };
}

// Masks a phone number for open browsing contexts — full number is only
// shown once there's an actual matched request, or for a hospital's
// legitimate verification lookup.
function maskPhone(phone) {
  if (!phone || phone.length < 4) return "••••••••";
  return "••••••" + phone.slice(-4);
}

module.exports = { resolveDonorContact, maskPhone };
