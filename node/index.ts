// Minimal index.ts for edit prediction only
import { attach } from "./nvim/nvim-node/attach.ts";

async function main() {
  // Check if we're in a neovim environment
  const nvimAddr = process.env.NVIM;
  if (!nvimAddr) {
    console.error("NVIM environment variable not set");
    process.exit(1);
  }

  try {
    const nvim = await attach({
      socket: nvimAddr,
      client: { name: "magenta-prediction" }
    });
    console.log("Connected to Neovim");

    // Simple message handler for testing
    nvim.onNotification("test", (args) => {
      console.log("Received test notification:", args);
    });

    // Notify Neovim that we're ready
    await nvim.call("nvim_exec_lua", ["return 'magenta_ready'", []]);
  } catch (error) {
    console.error("Failed to connect to Neovim:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});