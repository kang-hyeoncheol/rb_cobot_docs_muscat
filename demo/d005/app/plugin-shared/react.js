const m = (globalThis.__RB_SHARED__||{})["react"];
if (!m) throw new Error("[plugin-ui] host shared module not registered: react");
export const { Children, Component, Fragment, Profiler, PureComponent, StrictMode, Suspense, cloneElement, createContext, createElement, createRef, forwardRef, isValidElement, lazy, memo, startTransition, useCallback, useContext, useDebugValue, useDeferredValue, useEffect, useId, useImperativeHandle, useInsertionEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, useTransition, version } = m;
export default (m.default ?? m);
