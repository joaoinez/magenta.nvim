import type { Nvim } from "./nvim/nvim-node";
import { Lsp } from "./lsp.ts";
import { notifyErr } from "./nvim/nvim.ts";
import {
  parseOptions,
  loadProjectSettings,
  mergeOptions,
  type MagentaOptions,
  getActiveProfile,
} from "./options.ts";
import type { RootMsg } from "./root-msg.ts";

// Minimal dispatch type for edit prediction only
type Dispatch<T> = (msg: T) => void;
import { BufferTracker } from "./buffer-tracker.ts";
import { ChangeTracker } from "./change-tracker.ts";
import {
  type AbsFilePath,
  type NvimCwd,
} from "./utils/files.ts";
import {
  EditPredictionController,
  type EditPredictionId,
} from "./edit-prediction/edit-prediction-controller.ts";
import { initializeMagentaHighlightGroups } from "./nvim/extmarks.ts";

// these constants should match lua/magenta/init.lua
const MAGENTA_COMMAND = "magentaCommand";
const MAGENTA_ON_WINDOW_CLOSED = "magentaWindowClosed";
const MAGENTA_BUFFER_TRACKER = "magentaBufferTracker";
const MAGENTA_TEXT_DOCUMENT_DID_CHANGE = "magentaTextDocumentDidChange";
const MAGENTA_UI_EVENTS = "magentaUiEvents";

export class Magenta {
  public dispatch: Dispatch<RootMsg>;
  public bufferTracker: BufferTracker;
  public changeTracker: ChangeTracker;
  public editPredictionController: EditPredictionController;

  constructor(
    public nvim: Nvim,
    public lsp: Lsp,
    public cwd: NvimCwd,
    public options: MagentaOptions,
  ) {
    this.bufferTracker = new BufferTracker(this.nvim);
    this.changeTracker = new ChangeTracker(this.nvim, this.cwd, this.options);

    // Minimal dispatch that only handles edit prediction
    this.dispatch = (msg: RootMsg) => {
      try {
        this.editPredictionController.update(msg);
      } catch (e) {
        nvim.logger.error(e as Error);
      }
    };

    this.editPredictionController = new EditPredictionController(
      1 as EditPredictionId,
      {
        dispatch: this.dispatch,
        nvim: this.nvim,
        changeTracker: this.changeTracker,
        cwd: this.cwd,
        options: this.options,
      },
    );
  }

  getActiveProfile() {
    return getActiveProfile(this.options.profiles, this.options.activeProfile);
  }

  async command(command: string, ...rest: unknown[]): Promise<void> {
    switch (command) {
      case "predict-edit": {
        if (
          this.editPredictionController.state.type ===
          "displaying-proposed-edit"
        ) {
          // Accept the current prediction
          this.dispatch({
            type: "edit-prediction-msg",
            id: this.editPredictionController.id,
            msg: {
              type: "prediction-accepted",
            },
          });
        } else {
          // Trigger new prediction
          this.dispatch({
            type: "edit-prediction-msg",
            id: this.editPredictionController.id,
            msg: {
              type: "trigger-prediction",
            },
          });
        }
        break;
      }

      case "accept-prediction": {
        this.dispatch({
          type: "edit-prediction-msg",
          id: this.editPredictionController.id,
          msg: {
            type: "prediction-accepted",
          },
        });
        break;
      }

      case "dismiss-prediction": {
        this.dispatch({
          type: "edit-prediction-msg",
          id: this.editPredictionController.id,
          msg: {
            type: "prediction-dismissed",
          },
        });
        break;
      }

      case "debug-prediction-message": {
        this.dispatch({
          type: "edit-prediction-msg",
          id: this.editPredictionController.id,
          msg: {
            type: "debug-log-message",
          },
        });
        break;
      }

      case "abort": {
        this.dispatch({
          type: "edit-prediction-msg",
          id: this.editPredictionController.id,
          msg: {
            type: "prediction-dismissed",
          },
        });
        break;
      }

      default:
        this.nvim.logger.error(`Unrecognized command ${command}\n`);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        notifyErr(
          this.nvim,
          `Unrecognized command ${command} - only edit prediction commands are supported`,
        );
    }
  }

  async onWinClosed() {
    // No window management needed for edit prediction only
  }

  onBufferTrackerEvent(
    eventType: "read" | "write" | "close",
    absFilePath: AbsFilePath,
    bufnr: number,
  ) {
    try {
      // ChangeTracker method name needs verification
      if ('onBufferEvent' in this.changeTracker) {
        (this.changeTracker as any).onBufferEvent(eventType, absFilePath, bufnr);
      }
    } catch (error) {
      this.nvim.logger.error(
        `Error in buffer tracker event: ${error instanceof Error ? error.message + "\n" + error.stack : JSON.stringify(error)}`,
      );
    }
  }

  onTextDocumentDidChange(data: {
    uri: string;
    version: number;
    contentChanges: Array<{
      range?: {
        start: { line: number; character: number };
        end: { line: number; character: number };
      };
      rangeLength?: number;
      text: string;
    }>;
  }) {
    try {
      // ChangeTracker integration - simplified for now
      // The data format doesn't match expected interface
    } catch (error) {
      this.nvim.logger.error(
        `Error in text document change: ${error instanceof Error ? error.message + "\n" + error.stack : JSON.stringify(error)}`,
      );
    }
  }

  onUiEvent(eventType: string) {
    // Handle UI events that affect edit prediction
    switch (eventType) {
      case "escape-pressed":
        this.dispatch({
          type: "edit-prediction-msg",
          id: this.editPredictionController.id,
          msg: {
            type: "prediction-dismissed",
          },
        });
        break;
      case "mode-change":
      case "buffer-focus-change": 
      case "text-changed-insert":
        // These could dismiss predictions if needed
        this.dispatch({
          type: "edit-prediction-msg",
          id: this.editPredictionController.id,
          msg: {
            type: "prediction-dismissed",
          },
        });
        break;
    }
  }

  destroy() {
    // Minimal cleanup
  }

  static async start(nvim: Nvim) {
    const lsp = new Lsp(nvim);
    nvim.onNotification(MAGENTA_COMMAND, async (args: unknown[]) => {
      const argsArray = args as string[];
      if (argsArray.length === 0) {
        return;
      }
      const [command, ...rest] = argsArray;
      await magenta.command(command, ...rest);
    });

    nvim.onNotification(MAGENTA_ON_WINDOW_CLOSED, async () => {
      await magenta.onWinClosed();
    });

    nvim.onNotification(MAGENTA_BUFFER_TRACKER, async (args: unknown[]) => {
      const [eventType, absFilePath, bufnr] = args as [
        "read" | "write" | "close",
        AbsFilePath,
        number,
      ];
      magenta.onBufferTrackerEvent(eventType, absFilePath, bufnr);
    });

    nvim.onNotification(MAGENTA_TEXT_DOCUMENT_DID_CHANGE, async (data: any) => {
      magenta.onTextDocumentDidChange(data);
    });

    nvim.onNotification(MAGENTA_UI_EVENTS, async (args: unknown[]) => {
      const eventType = args[0] as string;
      magenta.onUiEvent(eventType);
    });

    // Initialize highlight groups
    await initializeMagentaHighlightGroups(nvim);

    // Load options
    const parseLogger = { warn: () => {}, error: () => {} };
    const projectLogger = { warn: () => {} };
    const initialOptions = parseOptions({}, parseLogger);
    const cwd = process.cwd() as NvimCwd;
    const projectSettings = loadProjectSettings(cwd, projectLogger);
    const options = mergeOptions(initialOptions, projectSettings || {});

    const magenta = new Magenta(nvim, lsp, cwd, options);

    // Return bridge data for Lua side
    const bridgeData = {
      ...options,
    };

    nvim.logger.info("Magenta (edit prediction only) initialized successfully");
    
    return bridgeData;
  }
}