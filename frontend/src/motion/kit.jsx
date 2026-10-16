import * as m from "motion/react-m";
import { Link, useLocation } from "react-router-dom";
import { SPRING_SOFT } from "./springs";

// Motion-enabled router link, for animating list rows that are links.
export const MLink = m.create(Link);

// Page entrance: the new screen rises and fades in. Only transform + opacity.
export function PageTransition({ children }) {
  const { pathname } = useLocation();
  return (
    <m.div key={pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SOFT}>
      {children}
    </m.div>
  );
}

// List stagger: children rise in one after another.
const container = { hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } } };
export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: SPRING_SOFT },
};

export function StaggerList({ children, className, style }) {
  return (
    <m.div className={className} style={style} variants={container} initial="hidden" animate="show">
      {children}
    </m.div>
  );
}

export function StaggerItem({ children, className, style }) {
  return (
    <m.div className={className} style={style} variants={staggerItem}>
      {children}
    </m.div>
  );
}
