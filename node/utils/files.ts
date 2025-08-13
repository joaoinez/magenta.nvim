import * as path from "node:path";

export type AbsFilePath = string & { __abs_file_path: true };
export type RelFilePath = string & { __rel_file_path: true };
export type UnresolvedFilePath = string & { __unresolved_file_path: true };

/** Special nominal type to represent the neovim directory. The node plugin runs in the magenta directory, but when
 * dealing with paths, we always want to do it from the POV of the nvim cwd.
 */
export type NvimCwd = AbsFilePath & { __nvim_cwd: true };

export function resolveFilePath(
  cwd: NvimCwd,
  filePath: UnresolvedFilePath | AbsFilePath | RelFilePath,
) {
  return path.resolve(cwd, filePath) as AbsFilePath;
}

export function relativePath(
  cwd: NvimCwd,
  filePath: UnresolvedFilePath | AbsFilePath,
) {
  const absPath = resolveFilePath(cwd, filePath);
  return path.relative(cwd, absPath) as RelFilePath;
}