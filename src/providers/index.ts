import type { BaseTimetableProvider } from "@studentsphere/ots-core";
import { NetypareoProvider } from "@studentsphere/ots-provider-netypareo";
import { WigorProvider } from "@studentsphere/ots-provider-wigor";

export const providers: BaseTimetableProvider[] = [new NetypareoProvider(), new WigorProvider()];

export function getProvider(id: string): BaseTimetableProvider | undefined {
  return providers.find((p) => p.id === id);
}
