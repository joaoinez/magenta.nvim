local M = {}

local Options = require("magenta.options")

M.default_keymaps = function()
  vim.keymap.set(
    "i",
    "<S-C-l>",
    "<Cmd>Magenta predict-edit<CR>",
    { silent = true, noremap = true, desc = "Predict/accept edit" }
  )

  vim.keymap.set(
    "n",
    "<S-C-l>",
    "<Cmd>Magenta predict-edit<CR>",
    { silent = true, noremap = true, desc = "Predict/accept edit" }
  )

  vim.keymap.set(
    "n",
    "<leader>mp",
    "<Cmd>Magenta predict-edit<CR>",
    { silent = true, noremap = true, desc = "Predict edit" }
  )

  vim.keymap.set(
    "n",
    "<leader>ma",
    "<Cmd>Magenta accept-prediction<CR>",
    { silent = true, noremap = true, desc = "Accept prediction" }
  )

  vim.keymap.set(
    "n",
    "<leader>md",
    "<Cmd>Magenta dismiss-prediction<CR>",
    { silent = true, noremap = true, desc = "Dismiss prediction" }
  )

  vim.keymap.set(
    "n",
    "<leader>md",
    "<Cmd>Magenta debug-prediction-message<CR>",
    { silent = true, noremap = true, desc = "Debug prediction message" }
  )
end



return M
