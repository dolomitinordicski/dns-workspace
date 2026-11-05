/**
 * Workspace requests an embedded presentation. The tool decides what to hide.
 * This is a visual hint only and must never affect Auth, access grants or APIs.
 */
export function workspaceEmbeddedUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'dolomitinordicski.github.io') {
    throw new Error('UNSUPPORTED_WORKSPACE_TOOL_ORIGIN');
  }
  url.searchParams.set('embedded', '1');
  return url.toString();
}
