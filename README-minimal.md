# magenta-prediction.nvim

```
  ___ ___
/' __` __`\
/\ \/\ \/\ \
\ \_\ \_\ \_\
 \/_/\/_/\/_/
 magenta is for edit prediction
```

magenta-prediction.nvim provides AI-powered edit prediction for neovim. It predicts your next edit based on recent changes and current cursor position, helping you code faster with intelligent suggestions.

## Features

- **AI-powered edit prediction**: Uses LLMs to predict your next edit based on context
- **Multiple provider support**: Works with Anthropic, OpenAI, Ollama, and Bedrock
- **Real-time suggestions**: Shows predictions as virtual text that can be accepted or dismissed
- **Change tracking**: Automatically tracks your recent edits to provide better predictions
- **Customizable**: Configure prediction behavior, system prompts, and provider settings

## Demo

![edit prediction demo](https://github.com/user-attachments/assets/2bebf6bb-9552-4396-94ce-f3f694b7265d)

## Installation

1. Install the plugin using your favorite plugin manager:

```lua
-- lazy.nvim
{
  "dlants/magenta.nvim",
  branch = "prediction-only", -- or use the main branch if prediction-only is available
  lazy = false,
  build = "npm install --frozen-lockfile",
  config = function()
    require('magenta').setup()
  end
}
```

2. Install dependencies:

```bash
cd ~/.local/share/nvim/lazy/magenta.nvim
npm install
```

## Configuration

Set up your API keys and configure prediction behavior:

```lua
require('magenta').setup({
  profiles = {
    {
      name = "claude-sonnet",
      provider = "anthropic", 
      model = "claude-3-5-sonnet-20241022",
      apiKeyEnvVar = "ANTHROPIC_API_KEY"
    },
    {
      name = "gpt-4o",
      provider = "openai",
      model = "gpt-4o", 
      apiKeyEnvVar = "OPENAI_API_KEY"
    }
  },
  editPrediction = {
    -- Optional: Use a specific profile for predictions
    -- profile = {
    --   provider = "anthropic",
    --   model = "claude-3-5-haiku-latest",
    --   apiKeyEnvVar = "ANTHROPIC_API_KEY"
    -- },
    
    -- Optional: Maximum number of changes to track (default: 10)
    -- changeTrackerMaxChanges = 20,
    
    -- Optional: Token budget for recent changes (default: 1000)
    -- recentChangeTokenBudget = 1500,
    
    -- Optional: Custom system prompt
    -- systemPrompt = "Your custom prediction system prompt here...",
    
    -- Optional: Additional instructions to append to system prompt
    -- systemPromptAppend = "Focus on completing function calls and variable declarations."
  }
})
```

## Usage

### Keymaps

The plugin provides the following default keymaps:

- `<S-C-l>` (Insert/Normal mode): Trigger prediction or accept current prediction
- `<leader>mp`: Trigger edit prediction
- `<leader>ma`: Accept current prediction  
- `<leader>md`: Dismiss current prediction
- `<leader>md`: Debug prediction message (shows the context being sent to the AI)

### Commands

- `:Magenta predict-edit`: Trigger prediction or accept current prediction
- `:Magenta accept-prediction`: Accept current prediction
- `:Magenta dismiss-prediction`: Dismiss current prediction
- `:Magenta debug-prediction-message`: Show debug information

### How it works

1. **Change Tracking**: The plugin automatically tracks your recent edits in all files
2. **Context Capture**: When you trigger a prediction, it captures the current context around your cursor
3. **AI Prediction**: Sends the recent changes and current context to an LLM to predict your next edit
4. **Virtual Text Preview**: Shows the predicted edit as virtual text in your buffer
5. **Accept/Dismiss**: You can accept the prediction to apply it, or dismiss it to ignore

## Requirements

- Neovim 0.9+
- Node.js 18+
- An API key for your preferred LLM provider

## Providers

### Anthropic
Set `ANTHROPIC_API_KEY` environment variable with your Anthropic API key.

### OpenAI  
Set `OPENAI_API_KEY` environment variable with your OpenAI API key.

### Ollama
No API key required. Make sure Ollama is running and configure the model in your profile.

### Bedrock
Configure your AWS credentials and region in the profile settings.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

ISC