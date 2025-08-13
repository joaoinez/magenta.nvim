// Minimal implementation for render.ts
import type { VDOMNode, MountedVDOM, MountPoint } from "./view";

export async function render({
  vdom,
  mount,
}: {
  vdom: VDOMNode;
  mount: MountPoint;
}): Promise<MountedVDOM> {
  // Simple implementation that just renders the content as a string
  const content = getStringContent(vdom);
  
  // For a minimal implementation, just return a simple mounted node
  const mountedNode: MountedVDOM = {
    type: "string",
    content: content,
    startPos: mount.startPos,
    endPos: mount.endPos,
  } as any;
  
  // Write the content to the buffer
  await mount.buffer.setLines({
    start: mount.startPos.row as any,
    end: mount.endPos.row + 1 as any,
    lines: content.split("\n") as any,
  });
  
  return mountedNode;
}

function getStringContent(node: VDOMNode): string {
  switch (node.type) {
    case "string":
      return node.content;
    case "node":
      return node.children.map(getStringContent).join("");
    case "array":
      return node.children.map(getStringContent).join("");
    default:
      return "";
  }
}