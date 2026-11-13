/**
 * ChatRoom — Cloudflare Durable Object.
 *
 * One instance per conversation (`idFromName(conversationId)`). The object is
 * the single writer for a thread, which gives us ordered fan-out without any
 * polling. D1 remains the system of record: the API route writes each message
 * through the normal repository, then forwards it here for realtime delivery.
 *
 * This file is intentionally dependency-free (structural types only) so it can
 * be type-checked in the Next.js project and bundled by Wrangler/OpenNext.
 */

interface DurableObjectStorageLike {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put<T = unknown>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
  list<T = unknown>(options?: { prefix?: string; limit?: number }): Promise<Map<string, T>>;
}

interface DurableObjectStateLike {
  storage: DurableObjectStorageLike;
  acceptWebSocket(socket: WebSocket): void;
  getWebSockets(): WebSocket[];
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

interface ChatSocketPair {
  0: WebSocket;
  1: WebSocket;
}

interface ChatSocketPairConstructor {
  new (): ChatSocketPair;
}

const MESSAGE_PREFIX = "msg:";
const MAX_MESSAGES = 500;
const MAX_BODY = 2000;

function isMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.senderId === "string" &&
    typeof candidate.body === "string" &&
    candidate.body.length > 0 &&
    candidate.body.length <= MAX_BODY
  );
}

export class ChatRoom {
  private readonly state: DurableObjectStateLike;

  constructor(state: DurableObjectStateLike) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get("upgrade")?.toLowerCase() === "websocket") {
      return this.upgrade(request);
    }

    if (request.method === "GET" && url.pathname.endsWith("/messages")) {
      const messages = await this.history();
      return Response.json({ messages });
    }

    if (request.method === "POST" && url.pathname.endsWith("/message")) {
      const payload = await request.json().catch(() => null);
      if (!isMessage(payload)) {
        return Response.json({ error: "Invalid message payload" }, { status: 400 });
      }
      const saved = await this.append(payload);
      return Response.json(saved, { status: 201 });
    }

    return new Response("Not found", { status: 404 });
  }

  /** Hibernatable WebSocket acceptance: the runtime suspends idle objects. */
  private upgrade(request: Request): Response {
    const Pair = (globalThis as unknown as { WebSocketPair?: ChatSocketPairConstructor }).WebSocketPair;
    if (!Pair) return new Response("WebSockets unavailable", { status: 501 });

    const pair = new Pair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);

    const conversationId = new URL(request.url).searchParams.get("conversationId") ?? "";
    void this.history().then((messages) => {
      try {
        server.send(JSON.stringify({ type: "history", conversationId, messages }));
      } catch {
        // The socket may have closed while history was loading.
      }
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as ResponseInit & { webSocket: WebSocket });
  }

  private async history(): Promise<ChatMessage[]> {
    const entries = await this.state.storage.list<ChatMessage>({ prefix: MESSAGE_PREFIX, limit: MAX_MESSAGES });
    return [...entries.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  private async append(message: ChatMessage): Promise<ChatMessage> {
    const stored: ChatMessage = {
      ...message,
      body: message.body.slice(0, MAX_BODY),
      createdAt: message.createdAt || new Date().toISOString(),
    };
    await this.state.storage.put(`${MESSAGE_PREFIX}${stored.createdAt}:${stored.id}`, stored);
    await this.trim();
    this.broadcast({ type: "message", message: stored });
    return stored;
  }

  private async trim() {
    const entries = await this.state.storage.list<ChatMessage>({ prefix: MESSAGE_PREFIX });
    if (entries.size <= MAX_MESSAGES) return;
    const oldest = [...entries.keys()].sort().slice(0, entries.size - MAX_MESSAGES);
    await Promise.all(oldest.map((key) => this.state.storage.delete(key)));
  }

  private broadcast(payload: unknown) {
    const serialized = JSON.stringify(payload);
    for (const socket of this.state.getWebSockets()) {
      try {
        socket.send(serialized);
      } catch {
        // Closed sockets are cleaned up by the runtime.
      }
    }
  }

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== "string") return;
    try {
      const payload = JSON.parse(raw) as unknown;
      if (!isMessage(payload)) return;
      await this.append(payload);
    } catch {
      socket.send(JSON.stringify({ type: "error", error: "Unreadable message" }));
    }
  }

  async webSocketClose(socket: WebSocket) {
    try {
      socket.close();
    } catch {
      // Already closed.
    }
  }
}
