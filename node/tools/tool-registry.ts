export const STATIC_TOOL_NAMES = [
  "predict_edit",
] as const;

export type StaticToolName = (typeof STATIC_TOOL_NAMES)[number];

export const CHAT_STATIC_TOOL_NAMES: StaticToolName[] = [];

export const SUBAGENT_STATIC_TOOL_NAMES: StaticToolName[] = [];
