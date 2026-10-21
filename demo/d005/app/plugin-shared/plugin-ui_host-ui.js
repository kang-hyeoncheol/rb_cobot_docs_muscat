const m = (globalThis.__RB_SHARED__||{})["@rainbow-robotics/plugin-ui/host-ui"];
if (!m) throw new Error("[plugin-ui] host shared module not registered: @rainbow-robotics/plugin-ui/host-ui");
export const { alert, confirm, getHostServices, prompt, setHostServices, toast } = m;
