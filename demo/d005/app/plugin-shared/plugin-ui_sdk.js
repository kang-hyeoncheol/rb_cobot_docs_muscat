const m = (globalThis.__RB_SHARED__||{})["@rainbow-robotics/plugin-ui/sdk"];
if (!m) throw new Error("[plugin-ui] host shared module not registered: @rainbow-robotics/plugin-ui/sdk");
export const { RbContext, useRb, useRbFormData, useRbSave } = m;
