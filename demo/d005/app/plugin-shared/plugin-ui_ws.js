const m = (globalThis.__RB_SHARED__||{})["@rainbow-robotics/plugin-ui/ws"];
if (!m) throw new Error("[plugin-ui] host shared module not registered: @rainbow-robotics/plugin-ui/ws");
export const { RbWs, createLazyRbSdk } = m;
