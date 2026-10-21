const m = (globalThis.__RB_SHARED__||{})["react-dom"];
if (!m) throw new Error("[plugin-ui] host shared module not registered: react-dom");
export const { __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, createPortal, createRoot, findDOMNode, flushSync, hydrate, hydrateRoot, render, unmountComponentAtNode, unstable_batchedUpdates, unstable_renderSubtreeIntoContainer, version } = m;
export default (m.default ?? m);
