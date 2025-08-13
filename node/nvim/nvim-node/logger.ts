import { resolve } from "node:path";
import {
  MessageType,
  type Client,
  type LogLevel,
  type RPCMessage,
} from "./types";

export function createLogger(client: Client, _level: LogLevel, file?: string) {
  const filename = file ? resolve(file) : `/tmp/${client.name}.log`;
  
  // Simple logger implementation
  const logger = {
    error: (message: string, ...args: any[]) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ERROR: ${message}`;
      console.error(logMessage, ...args);
      // Write to file if needed
      if (file) {
        require('fs').appendFileSync(filename, logMessage + '\n');
      }
    },
    warn: (message: string, ...args: any[]) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] WARN: ${message}`;
      console.warn(logMessage, ...args);
      if (file) {
        require('fs').appendFileSync(filename, logMessage + '\n');
      }
    },
    info: (message: string, ...args: any[]) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] INFO: ${message}`;
      console.info(logMessage, ...args);
      if (file) {
        require('fs').appendFileSync(filename, logMessage + '\n');
      }
    },
    debug: (message: string, ...args: any[]) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] DEBUG: ${message}`;
      console.debug(logMessage, ...args);
      if (file) {
        require('fs').appendFileSync(filename, logMessage + '\n');
      }
    }
  };

  return logger;
}

export function prettyRPCMessage(message: RPCMessage, direction: "out" | "in") {
  const prefix = direction === "out" ? "OUTGOING" : "INCOMING";

  if (message[0] === MessageType.REQUEST) {
    return {
      [`${prefix}_RPC_REQUEST`]: {
        reqId: message[1],
        method: message[2],
        params: message[3],
      },
    };
  }

  if (message[0] === MessageType.RESPONSE) {
    return {
      [`${prefix}_RPC_RESPONSE`]: {
        reqId: message[1],
        error: message[2],
        result: message[3],
      },
    };
  }

  // if (message[0] === MessageType.NOTIFY)
  return {
    [`${prefix}_RPC_NOTIFICATION`]: {
      event: message[1],
      args: message[2],
    },
  };
}
