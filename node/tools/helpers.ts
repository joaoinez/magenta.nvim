import * as PredictEdit from "./predict-edit";
import type { StreamingBlock } from "../providers/helpers";
import { d, type VDOMNode } from "../tea/view";
import type { StaticToolName } from "./tool-registry";
import { assertUnreachable } from "../utils/assertUnreachable";

export function validateInput(
  toolName: unknown,
  input: { [key: string]: unknown },
) {
  const toolNameStr = toolName as string;

  // Handle MCP tools
  if (toolNameStr.startsWith("mcp_")) {
    return {
      status: "ok" as const,
      value: input,
    };
  }

  switch (toolName as StaticToolName) {
    case "predict_edit":
      return PredictEdit.validateInput(input);
    default:
      throw new Error(`Unexpected toolName: ${toolName as string}`);
  }
}

export function renderStreamdedTool(
  streamingBlock: Extract<StreamingBlock, { type: "tool_use" }>,
): string | VDOMNode {
  if (streamingBlock.name.startsWith("mcp_")) {
    return d`Invoking mcp tool ${streamingBlock.name}`;
  }

  const name = streamingBlock.name as StaticToolName;
  switch (name) {
    case "predict_edit":
      break;
    default:
      assertUnreachable(name);
  }

  return d`Invoking tool ${streamingBlock.name}`;
}
