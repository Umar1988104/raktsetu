// Shared spring presets. Springs (not fixed-duration easing) are what give the
// iOS feel: things settle naturally and can be interrupted mid-flight.
export const SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 }; // default UI
export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 30, mass: 1 }; // page / list entrances
export const SPRING_SHEET = { type: "spring", stiffness: 380, damping: 38, mass: 1 }; // sheets
export const SPRING_SNAPPY = { type: "spring", stiffness: 600, damping: 38, mass: 0.7 }; // switches, thumbs

// Sheets slide up on phones and fade/scale in on larger screens.
export const SHEET_MOBILE = {
  initial: { y: "100%" },
  animate: { y: 0 },
  exit: { y: "100%" },
};
export const SHEET_DESKTOP = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 8 },
};
