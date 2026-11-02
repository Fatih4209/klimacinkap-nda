import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  postStaffLocation,
  type PendingLocationPing,
  type StaffLocationPingInput,
} from "@klimacin/shared";

type LocationClient = Parameters<typeof postStaffLocation>[0];

const STORAGE_KEY = "kk.staff.pendingLocationPings";

export async function enqueueLocationPing(
  input: StaffLocationPingInput,
): Promise<void> {
  const pending = await readQueue();
  pending.push({
    ...input,
    localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    queuedAt: new Date().toISOString(),
  });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
}

export async function flushLocationQueue(
  client: LocationClient,
): Promise<{ flushed: number; remaining: number; lastError?: string }> {
  const pending = await readQueue();
  if (pending.length === 0) {
    return { flushed: 0, remaining: 0 };
  }

  const remaining: PendingLocationPing[] = [];
  let flushed = 0;
  let lastError: string | undefined;

  for (const item of pending) {
    const result = await postStaffLocation(client, {
      assignmentId: item.assignmentId,
      lat: item.lat,
      lng: item.lng,
      accuracyM: item.accuracyM,
      recordedAt: item.recordedAt ?? item.queuedAt,
    });
    if (result.ok) {
      flushed += 1;
    } else {
      lastError = result.error;
      remaining.push(item);
      // Keep later pings for same assignment too if one fails (e.g. offline).
      const rest = pending.slice(pending.indexOf(item) + 1);
      remaining.push(...rest);
      break;
    }
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  return { flushed, remaining: remaining.length, lastError };
}

async function readQueue(): Promise<PendingLocationPing[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as PendingLocationPing[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
