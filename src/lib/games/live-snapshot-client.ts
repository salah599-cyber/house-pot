export type GameLiveSnapshot = {
  status: "draft" | "open" | "active" | "settled" | "cancelled";
  txCount: number;
  latestTxAt: string | null;
};

export function serializeLiveSnapshot(snapshot: GameLiveSnapshot) {
  return JSON.stringify(snapshot);
}
