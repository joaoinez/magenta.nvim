import * as PredictEdit from "./predict-edit.ts";

import { assertUnreachable } from "../utils/assertUnreachable.ts";
import { type Dispatch } from "../tea/tea.ts";
import type { Nvim } from "../nvim/nvim-node";
import type { Lsp } from "../lsp.ts";
import type { MagentaOptions } from "../options.ts";
import type { RootMsg } from "../root-msg.ts";
import type { MessageId } from "../chat/message.ts";
import type { BufferTracker } from "../buffer-tracker.ts";
import type { Chat } from "../chat/chat.ts";
import type {
  ToolMsg,
  ToolName,
  ToolRequestId,
  ToolRequest,
  ToolManagerToolMsg,
  Tool,
} from "./types.ts";
import type { ProviderToolSpec } from "../providers/provider-types.ts";
import {
  CHAT_STATIC_TOOL_NAMES,
  SUBAGENT_STATIC_TOOL_NAMES,
  type StaticToolName,
} from "./tool-registry.ts";
import type { ThreadId, ThreadType } from "../chat/types.ts";
import type { NvimCwd } from "../utils/files.ts";
export type { Tool, ToolRequestId } from "./types.ts";

export type StaticToolMap = {
  predict_edit: {
    controller: PredictEdit.PredictEditTool;
    input: PredictEdit.Input;
    msg: PredictEdit.Msg;
    spec: typeof PredictEdit.spec;
  };
};

export type StaticToolRequest = {
  [K in keyof StaticToolMap]: {
    id: ToolRequestId;
    toolName: K;
    input: StaticToolMap[K]["input"];
  };
}[keyof StaticToolMap];

type StaticTool = {
  [K in keyof StaticToolMap]: StaticToolMap[K]["controller"];
}[keyof StaticToolMap];

export function wrapStaticToolMsg(
  msg: StaticToolMap[keyof StaticToolMap]["msg"],
): ToolMsg {
  return msg as unknown as ToolMsg;
}

export function unwrapStaticToolMsg<
  StaticToolName extends keyof StaticToolMap = keyof StaticToolMap,
>(msg: ToolMsg): StaticToolMap[StaticToolName]["msg"] {
  return msg as unknown as StaticToolMap[StaticToolName]["msg"];
}

export type Msg =
  | {
      type: "init-tool-use";
      threadId: ThreadId;
      messageId: MessageId;
      request: ToolRequest;
    }
  | ToolManagerToolMsg;

export class ToolManager {
  private tools: {
    [id: ToolRequestId]: StaticTool;
  };

  constructor(
    public myDispatch: (msg: Msg) => void,
    private context: {
      dispatch: Dispatch<RootMsg>;
      bufferTracker: BufferTracker;
      getDisplayWidth: () => number;
      threadId: ThreadId;
      nvim: Nvim;
      lsp: Lsp;
      cwd: NvimCwd;
      options: MagentaOptions;
      chat: Chat;
    },
  ) {
    this.tools = {};
  }
  
  private static readonly TOOL_SPEC_MAP: {
    [K in StaticToolName]: ProviderToolSpec;
  } = {
    predict_edit: PredictEdit.spec,
  };

  getToolSpecs(threadType: ThreadType): ProviderToolSpec[] {
    let staticToolNames: StaticToolName[] = [];
    switch (threadType) {
      case "subagent_learn":
      case "subagent_plan":
      case "subagent_default":
      case "subagent_fast":
        staticToolNames = [];
        break;
      case "root":
        staticToolNames = [];
        break;
      default:
        staticToolNames = [];
        break;
    }

    return [
      ...staticToolNames.map((toolName) => ToolManager.TOOL_SPEC_MAP[toolName]),
    ];
  }

  getTool(id: ToolRequestId): Tool {
    return this.tools[id] as unknown as Tool;
  }

  renderToolResult(id: ToolRequestId) {
    const tool: StaticTool = this.tools[id];
    return tool.renderSummary();
  }

  update(msg: Msg) {
    switch (msg.type) {
      case "init-tool-use": {
        // Only handle predict_edit tool
        const staticRequest = msg.request as StaticToolRequest;
        if (staticRequest.toolName === "predict_edit") {
          const predictEditTool = new PredictEdit.PredictEditTool(
            staticRequest as Extract<StaticToolRequest, { toolName: "predict_edit" }>,
            msg.threadId,
            msg.messageId,
            {
              myDispatch: (msg) =>
                this.myDispatch({
                  type: "tool-msg",
                  msg: {
                    id: staticRequest.id,
                    toolName: "predict_edit" as ToolName,
                    msg: msg as unknown as ToolMsg,
                  },
                }),
            },
          );

          this.tools[staticRequest.id] = predictEditTool;
          return;
        }
        
        throw new Error(`Unsupported tool: ${staticRequest.toolName}`);
      }

      case "tool-msg": {
        const tool = this.tools[msg.msg.id];
        if (!tool) {
          throw new Error(`Tool ${msg.msg.id} not found.`);
        }

        tool.update(unwrapStaticToolMsg(msg.msg.msg) as any);
        break;
      }

      default:
        return assertUnreachable(msg);
    }
  }
}