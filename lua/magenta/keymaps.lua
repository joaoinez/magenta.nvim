local M = {}

local Options = require("magenta.options")

M.default_keymaps = function()
	-- vim.keymap.set(
	--   "n",
	--   "<leader>ma",
	--   ":Magenta abort<CR>",
	--   { silent = true, noremap = true, desc = "Abort/dismiss current prediction" }
	-- )

	vim.keymap.set(
		"i",
		"<Tab>",
		"<Cmd>Magenta predict-edit<CR>",
		{ silent = true, noremap = true, desc = "Predict/accept edit" }
	)

	vim.keymap.set(
		"n",
		"<Tab>",
		"<Cmd>Magenta predict-edit<CR>",
		{ silent = true, noremap = true, desc = "Predict/accept edit" }
	)
end

local mode_to_keymap = {
	normal = "n",
	visual = "v",
	insert = "i",
	command = "c",
}

M.set_sidebar_buffer_keymaps = function(bufnr)
	for mode, values in pairs(Options.options.sidebarKeymaps) do
		for key, action in pairs(values) do
			vim.keymap.set(mode_to_keymap[mode], key, action, { buffer = bufnr, noremap = true, silent = true })
		end
	end
end

M.set_display_buffer_keymaps = function(bufnr)
	for mode, values in pairs(Options.options.displayKeymaps) do
		for key, action in pairs(values) do
			vim.keymap.set(mode_to_keymap[mode], key, action, { buffer = bufnr, noremap = true, silent = true })
		end
	end
end

return M
