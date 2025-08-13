import type { Nvim } from "./nvim/nvim-node";
import { Lsp } from "./lsp";
import { getcwd, notifyErr } from "./nvim/nvim";
import {
  parseOptions,
  loadProjectSettings,
  mergeOptions,
  type MagentaOptions,
  getActiveProfile,
} from "./options";
import type { RootMsg } from "./root-msg";
import type { Dispatch } from "./tea/tea";
import { BufferTracker } from "./buffer-tracker";
import { ChangeTracker } from "./change-tracker";
import type { NvimCwd, AbsFilePath } from "./utils/files";
import type { BufNr } from "./nvim/buffer";
import { assertUnreachable } from "./utils/assertUnreachable";
import {
  EditPredictionController,
  type EditPredictionId,
} from "./edit-prediction/edit-prediction-controller";
import { initializeMagentaHighlightGroups } from "./nvim/extmarks";
import { MAGENTA_HIGHLIGHT_NAMESPACE } from "./nvim/buffer";

// these constants should match lua/magenta/init.lua
const MAGENTA_COMMAND = "magentaCommand";
const MAGENTA_ON_WINDOW_CLOSED = "magentaWindowClosed";
const MAGENTA_KEY = "magentaKey";
const MAGENTA_LSP_RESPONSE = "magentaLspResponse";
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

  async command(input: string): Promise<void> {
    const [command] = input.trim().split(/\s+/);
    this.nvim.logger.debug(`Received command ${command}`);
    switch (command) {

      case "predict-edit": {
        if (
          this.editPredictionController.state.type ===
          "displaying-proposed-edit"
        ) {
          this.dispatch({
            type: "edit-prediction-msg",
            id: this.editPredictionController.id,
            msg: {
              type: "prediction-accepted",
            },
          });
        } else {
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

      default:
        this.nvim.logger.error(`Unrecognized command ${command}\n`);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        notifyErr(
          this.nvim,
          "unrecognized command",
          new Error(`Unrecognized command ${command}\n`),
        );
    }
  }

  onKey(args: string[]) {
    const key = args[0];
    this.nvim.logger.error(`Unexpected MagentaKey ${JSON.stringify(key)}`);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    notifyErr(
      this.nvim,
      "unexpected key",
      new Error(`Unexpected MagentaKey ${JSON.stringify(key)}`),
    );
  }

  async onWinClosed() {
    // No windows to close in edit prediction only mode
  }

  onBufferTrackerEvent(
    eventType: "read" | "write" | "close",
    absFilePath: AbsFilePath,
    bufnr: BufNr,
  ) {
    // Handle buffer events in our tracker
    switch (eventType) {
      case "read":
      case "write":
        this.bufferTracker.trackBufferSync(absFilePath, bufnr).catch((err) => {
          this.nvim.logger.error(
            `Error tracking buffer sync for ${absFilePath}: ${err}`,
          );
        });

        // Dismiss any active prediction when buffer changes
        if (eventType === "write") {
          this.dispatch({
            type: "edit-prediction-msg",
            id: this.editPredictionController.id,
            msg: {
              type: "prediction-dismissed",
            },
          });
        }
        break;
      case "close":
        this.bufferTracker.clearFileTracking(absFilePath);
        break;
      default:
        assertUnreachable(eventType);
    }
  }

  onUiEvent(
    _eventType:
      | "mode-change"
      | "buffer-focus-change"
      | "text-changed-insert"
      | "escape-pressed",
  ) {
    if (
      this.editPredictionController.state.type === "displaying-proposed-edit"
    ) {
      this.dispatch({
        type: "edit-prediction-msg",
        id: this.editPredictionController.id,
        msg: {
          type: "prediction-dismissed",
        },
      });
    }
  }

  destroy() {
    // No cleanup needed for edit prediction only mode
  }

  static async start(nvim: Nvim) {
    const lsp = new Lsp(nvim);
    nvim.onNotification(MAGENTA_COMMAND, async (args: unknown[]) => {
      try {
        await magenta.command(args[0] as string);
      } catch (err) {
        nvim.logger.error(
          err instanceof Error
            ? `Error executing command ${args[0] as string}: ${err.message}\n${err.stack}`
            : JSON.stringify(err),
        );
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        notifyErr(nvim, `error processing command ${args[0] as string}`, err);
      }
    });

    nvim.onNotification(MAGENTA_ON_WINDOW_CLOSED, async () => {
      try {
        await magenta.onWinClosed();
      } catch (err) {
        nvim.logger.error(err as Error);
      }
    });

    nvim.onNotification(MAGENTA_KEY, (args) => {
      try {
        magenta.onKey(args as string[]);
      } catch (err) {
        nvim.logger.error(err as Error);
      }
    });

    nvim.onNotification(MAGENTA_LSP_RESPONSE, (...args) => {
      try {
        lsp.onLspResponse(args);
      } catch (err) {
        nvim.logger.error(JSON.stringify(err));
      }
    });

    nvim.onNotification(MAGENTA_BUFFER_TRACKER, (args) => {
      try {
        if (
          args.length < 3 ||
          typeof args[0] !== "string" ||
          typeof args[1] !== "string" ||
          typeof args[2] !== "number"
        ) {
          throw new Error(
            `Expected buffer tracker args to be [eventType, filePath, bufnr]`,
          );
        }

        const eventType = args[0];
        // Validate that eventType is one of the expected values
        if (
          eventType !== "read" &&
          eventType !== "write" &&
          eventType !== "close"
        ) {
          throw new Error(
            `Invalid eventType: ${eventType}. Expected 'read', 'write', or 'close'`,
          );
        }

        const absFilePath = args[1] as AbsFilePath;
        const bufnr = args[2] as number as BufNr;

        magenta.onBufferTrackerEvent(eventType, absFilePath, bufnr);
      } catch (err) {
        nvim.logger.error(
          `Error handling buffer tracker event for ${JSON.stringify(args)}: ${err instanceof Error ? err.message + "\n" + err.stack : JSON.stringify(err)}`,
        );
      }
    });

    nvim.onNotification(MAGENTA_TEXT_DOCUMENT_DID_CHANGE, (data) => {
      try {
        // Data comes as an array with a single object element from Lua
        if (!Array.isArray(data) || data.length !== 1) {
          throw new Error(
            "Expected change data to be an array with one element",
          );
        }

        const changeData = data[0] as {
          filePath?: unknown;
          oldText?: unknown;
          newText?: unknown;
          range?: unknown;
        };

        if (
          typeof changeData.filePath !== "string" ||
          typeof changeData.oldText !== "string" ||
          typeof changeData.newText !== "string" ||
          typeof changeData.range !== "object" ||
          changeData.range === null
        ) {
          throw new Error(
            `Invalid change data format: expected { filePath: string, oldText: string, newText: string, range: object }, got ${JSON.stringify(changeData)}`,
          );
        }

        magenta.changeTracker.onTextDocumentDidChange(
          changeData as {
            filePath: string;
            oldText: string;
            newText: string;
            range: {
              start: { line: number; character: number };
              end: { line: number; character: number };
            };
          },
        );
      } catch (err) {
        nvim.logger.error(
          `Error handling text document change: ${err instanceof Error ? err.message + "\n" + err.stack : JSON.stringify(err)}`,
        );
      }
    });

    nvim.onNotification(MAGENTA_UI_EVENTS, (args) => {
      try {
        if (
          !Array.isArray(args) ||
          args.length < 1 ||
          typeof args[0] !== "string"
        ) {
          throw new Error(`Expected UI event args to be [eventType]`);
        }

        const eventType = args[0];
        // Validate that eventType is one of the expected values
        if (
          eventType !== "mode-change" &&
          eventType !== "buffer-focus-change" &&
          eventType !== "text-changed-insert" &&
          eventType !== "escape-pressed"
        ) {
          throw new Error(
            `Invalid UI eventType: ${eventType}. Expected 'mode-change', 'buffer-focus-change', 'text-changed-insert', or 'escape-pressed'`,
          );
        }

        magenta.onUiEvent(eventType);
      } catch (err) {
        nvim.logger.error(
          `Error handling UI event for ${JSON.stringify(args)}: ${err instanceof Error ? err.message + "\n" + err.stack : JSON.stringify(err)}`,
        );
      }
    });
    const opts = await nvim.call("nvim_exec_lua", [
      `return require('magenta').bridge(${nvim.channelId})`,
      [],
    ]);

    // Parse base options from Lua
    const baseOptions = parseOptions(opts, nvim.logger);

    // Load and parse project settings
    const cwd = await getcwd(nvim);
    const projectSettings = loadProjectSettings(cwd, {
      warn: (msg) => nvim.logger.warn(`Project settings: ${msg}`),
    });

    // Merge project settings with base options
    const parsedOptions = projectSettings
      ? mergeOptions(baseOptions, projectSettings)
      : baseOptions;
    const magenta = new Magenta(nvim, lsp, cwd, parsedOptions);

    // Initialize highlight groups in the magenta namespace
    try {
      await nvim.call("nvim_create_namespace", [MAGENTA_HIGHLIGHT_NAMESPACE]);
      await initializeMagentaHighlightGroups(nvim);
    } catch (error) {
      nvim.logger.error(
        "Failed to initialize highlight groups:",
        error instanceof Error ? error.message : String(error),
      );
    }

    nvim.logger.info(`Magenta initialized. ${JSON.stringify(parsedOptions)}`);
    return magenta;
  }
}
