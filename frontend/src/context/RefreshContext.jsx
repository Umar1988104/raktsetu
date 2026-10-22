import { createContext, useContext, useEffect, useRef } from "react";

// A page can say "this is how to refresh me" and the layout's pull-down
// gesture will call it (v2.0). Pages that don't register one don't pull.
const RefreshContext = createContext({ register: () => () => {}, handlerRef: { current: null } });

export function RefreshProvider({ children }) {
  const handlerRef = useRef(null);
  const value = useRef({
    handlerRef,
    register: (fn) => {
      handlerRef.current = fn;
      document.documentElement.classList.add("has-ptr");
      return () => {
        if (handlerRef.current === fn) handlerRef.current = null;
        document.documentElement.classList.remove("has-ptr");
      };
    },
  }).current;
  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>;
}

export const useRefreshContext = () => useContext(RefreshContext);

// In a page: useRefreshHandler(load)
export function useRefreshHandler(fn) {
  const { register } = useContext(RefreshContext);
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => register(() => ref.current()), [register]);
}
