import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

const mcpIdentity = new AsyncLocalStorage<string>();

export function runWithMcpIdentity<T>(email: string, action: () => T): T {
  return mcpIdentity.run(email, action);
}

export function currentMcpIdentity(): string | undefined {
  return mcpIdentity.getStore();
}
