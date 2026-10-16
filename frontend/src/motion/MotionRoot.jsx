import { LazyMotion, MotionConfig } from "motion/react";
import { SPRING } from "./springs";

const loadFeatures = () => import("./features").then((mod) => mod.default);

// `reducedMotion="user"` makes every animation in the app honour the device's
// "reduce motion" setting (movement is dropped; simple fades remain).
export default function MotionRoot({ children }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={SPRING}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
