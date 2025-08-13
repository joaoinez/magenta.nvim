local M = {}

local defaults = {
  profiles = {
    {
      name = "claude-sonnet-3.7",
      provider = "anthropic",
      model = "claude-3-7-sonnet-latest",
      apiKeyEnvVar = "ANTHROPIC_API_KEY"
    },
    {
      name = "claude-sonnet-4",
      provider = "anthropic",
      model = "claude-sonnet-4-20250514",
      apiKeyEnvVar = "ANTHROPIC_API_KEY"
    },
    {
      name = "claude-opus-4",
      provider = "anthropic",
      model = "claude-opus-4-20250514",
      apiKeyEnvVar = "ANTHROPIC_API_KEY"
    },
    {
      name = "claude-max",
      provider = "anthropic",
      model = "claude-sonnet-4-latest",
      authType = "max"
    },
    {
      name = "gpt-4o",
      provider = "openai",
      model = "gpt-4o",
      apiKeyEnvVar = "OPENAI_API_KEY"
    },
    {
      name = "copilot-claude-sonnet",
      provider = "copilot",
      model = "claude-3-5-sonnet-20241022"
    }
  },
  editPrediction = {
    -- profile = {
    --   provider = "anthropic",
    --   model = "claude-3-5-haiku-latest",
    --   apiKeyEnvVar = "ANTHROPIC_API_KEY"
    -- },
    -- changeTrackerMaxChanges = 20,
    -- recentChangeTokenBudget = 1500,
    -- systemPrompt = "Your custom prediction system prompt here...",
    -- systemPromptAppend = "Focus on completing function calls and variable declarations."
  },
}

M.options = defaults

M.set_options = function(opts)
  M.options = vim.tbl_deep_extend("force", defaults, opts or {})
  if opts.picker == nil then
    local pickers = { "fzf-lua", "telescope", "snacks" }
    for _, picker in ipairs(pickers) do
      local success, _ = pcall(require, picker)
      if success then
        M.options.picker = picker
        break
      end
    end
  end
end

return M
