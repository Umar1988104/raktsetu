import { Info } from "lucide-react";

// Blood group (and sex) are typed in by people themselves — RaktSetu can't test
// blood. This note keeps that honest wherever blood groups are shown.
export default function SelfDeclaredNote({ children }) {
  return (
    <p className="self-declared">
      <Info size={14} aria-hidden="true" />
      <span>
        {children || "Blood group is self-declared. “Verified” means a hospital partner checked the donor. Always confirm the blood group at the blood bank."}
      </span>
    </p>
  );
}
