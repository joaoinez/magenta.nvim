# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Run
- `npm install --frozen-lockfile` - Install dependencies with exact versions
- `npm run start` - Start the main application (runs `npx tsx node/index.ts`)
- `npm run setup-precommit` - Set up git pre-commit hooks

### Testing
- `npx vitest` - Run all tests
- `npx vitest [filter]` - Run tests matching filter pattern
- `npx vitest -u` - Update test snapshots
- `npx vitest --inspect-wait` - Run tests with debugger (prints browser debug URL)

### Code Quality
- `npx tsc --noEmit` - TypeScript type checking
- `npx eslint . --fix` - Lint and auto-fix code
- `npx prettier --write .` - Format code

### Development Setup
- Run `scripts/setup-hooks.sh` to set up pre-commit hooks
- Pre-commit runs typecheck, eslint, and prettier automatically

## Architecture Overview

Magenta.nvim is a Neovim AI coding assistant built with TypeScript and Lua, following The Elm Architecture (TEA) pattern.

### Core Architecture
- **Event-driven architecture** using TEA with controllers and message dispatching
- **Bidirectional communication** between Neovim (Lua) and Node.js (TypeScript) via RPC
- **State management** through controllers that handle specific application domains
- **Declarative rendering** using a VDOM-like system for text buffers

### Key Components

**Startup Flow:**
1. `lua/magenta/init.lua` - Initializes and starts Node.js process
2. `node/index.ts` - Entry point, establishes nvim-node connection
3. `node/magenta.ts` - Main controller with central message dispatcher

**Core Controllers:**
- `Chat` (`node/chat/`) - Manages conversation threads and messages  
- `Sidebar` (`node/sidebar.ts`) - Handles UI sidebar state and display
- `EditPredictionController` (`node/edit-prediction/`) - Handles AI-powered edit predictions (PRIMARY FEATURE)
- `ContextManager` (`node/context/`) - Manages file context for conversations
- `ToolManager` (`node/tools/`) - Minimal tool system supporting only predict_edit tool

**Communication Layer:**
- `node/nvim/` - Neovim API bindings and buffer management
- `node/lsp.ts` - LSP integration for code intelligence
- `lua/magenta/` - Lua-side event handling and command registration

**Provider System:**
- `node/providers/` - Abstraction layer for different LLM providers (Anthropic, OpenAI, Bedrock, Ollama, Copilot)
- Supports multiple authentication methods including API keys and OAuth

### Message Flow
1. User action triggers Lua command
2. Lua sends RPC notification to Node.js
3. `Magenta.command()` or event handlers process the message
4. Central dispatcher routes messages to appropriate controllers
5. Controllers update state and may dispatch additional messages
6. Views render based on updated state
7. Changes sync back to Neovim buffers

### Testing
- **Comprehensive test suite** using Vitest with snapshot testing
- **End-to-end testing** with fresh Neovim instances per test
- **Test utilities** in `node/test/driver.ts` for common operations
- **Parallel test execution** for performance

### File Organization
- `lua/` - Neovim Lua plugin code
- `node/` - TypeScript application code
- `node/test/` - Test suite with fixtures and utilities
- `node/tools/` - Tool implementations for AI agent capabilities
- `node/providers/` - LLM provider integrations
- `node/tea/` - TEA architecture implementation
- `plans/` and `notes/` - Development documentation

## Development Guidelines

### Adding New Features
1. Create tests in adjacent `*.spec.ts` files
2. Follow TEA architecture: define messages, update state, render views
3. Use the central dispatcher for cross-controller communication
4. Add appropriate tool implementations in `node/tools/`

### Tool Development  
The tool system has been simplified to support only the predict_edit tool:
- Only `predict_edit` tool remains active
- Located in `node/tools/predict-edit.ts` 
- Implements StaticTool interface from `node/tools/types.ts`
- Used exclusively by EditPredictionController

**Removed AI Agent Tools:**
- File manipulation: `get_file`, `insert`, `replace`, `list_directory`
- Code intelligence: `hover`, `find_references`, `diagnostics`  
- Shell execution: `bash_command`
- Thread/agent management: `thread_title`, `fork_thread`, `spawn_subagent`, `spawn_foreach`, `wait_for_subagents`, `yield_to_parent`
- MCP integration: `mcp/` directory removed
- File utilities: `applyEdit`, `file-snapshots`, `display-snapshot-diff`

### Key Patterns
- Controllers manage their own state rather than pure functional updates
- Use `withBindings()` to attach interactive behaviors to rendered text
- Always validate RPC message parameters and handle errors gracefully
- Maintain compatibility between Lua and TypeScript interfaces

### Debugging
- Logs: `/tmp/magenta.log` (plugin), `/tmp/test.log` (tests)
- All RPC messages between Neovim and Node.js are logged
- Use `nvim.logger` for structured logging with different levels