const m = (globalThis.__RB_SHARED__||{})["react-dom/client"];
if (!m) throw new Error("[plugin-ui] host shared module not registered: react-dom/client");
export const { createRoot, hydrateRoot } = m;
