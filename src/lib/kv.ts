import { FrameNotificationDetails } from "@farcaster/frame-sdk";
import { Redis } from "@upstash/redis";

// In-memory fallback storage
const localStore = new Map<string, any>();

// Use Redis if KV env vars are present, otherwise use in-memory
const useRedis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
const redis = useRedis ? new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
}) : null;

// General KV interface for the application
export const kv = {
  get: async (key: string): Promise<string | null> => {
    if (redis) {
      return await redis.get(key);
    }
    return localStore.get(key) || null;
  },
  
  set: async (key: string, value: any): Promise<void> => {
    if (redis) {
      await redis.set(key, value);
    } else {
      localStore.set(key, value);
    }
  },
  
  exists: async (key: string): Promise<boolean> => {
    if (redis) {
      return (await redis.exists(key)) > 0;
    }
    return localStore.has(key);
  },
  
  del: async (key: string): Promise<void> => {
    if (redis) {
      await redis.del(key);
    } else {
      localStore.delete(key);
    }
  }
};

function getUserNotificationDetailsKey(fid: number): string {
  return `${process.env.NEXT_PUBLIC_FRAME_NAME}:user:${fid}`;
}

export async function getUserNotificationDetails(
  fid: number
): Promise<FrameNotificationDetails | null> {
  const key = getUserNotificationDetailsKey(fid);
  if (redis) {
    return await redis.get<FrameNotificationDetails>(key);
  }
  return localStore.get(key) || null;
}

export async function setUserNotificationDetails(
  fid: number,
  notificationDetails: FrameNotificationDetails
): Promise<void> {
  const key = getUserNotificationDetailsKey(fid);
  if (redis) {
    await redis.set(key, notificationDetails);
  } else {
    localStore.set(key, notificationDetails);
  }
}

export async function deleteUserNotificationDetails(
  fid: number
): Promise<void> {
  const key = getUserNotificationDetailsKey(fid);
  if (redis) {
    await redis.del(key);
  } else {
    localStore.delete(key);
  }
}
