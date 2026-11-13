import { getCloudflareEnv } from "./env";

export interface QueueEvent {
  id: string;
  type: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

/**
 * Publishes a domain event. On Workers this is a Cloudflare Queue send; locally
 * the message is logged so the outbox dispatcher can be exercised end-to-end.
 */
export async function publishToQueue(event: QueueEvent): Promise<void> {
  const env = await getCloudflareEnv();
  if (env.BOOKING_QUEUE) {
    await env.BOOKING_QUEUE.send(event);
    return;
  }
  if (process.env.NODE_ENV !== "test") {
    console.info(`[queue] ${event.type} ${event.aggregateType}:${event.aggregateId}`);
  }
}
