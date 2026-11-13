export type AppErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAVAILABLE"
  | "PAYMENT"
  | "RATE_LIMITED"
  | "INTERNAL";

const STATUS: Record<AppErrorCode, number> = {
  VALIDATION: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNAVAILABLE: 409,
  PAYMENT: 402,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: Record<string, string>;

  constructor(code: AppErrorCode, message: string, details?: Record<string, string>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}

export const badRequest = (message: string, details?: Record<string, string>) =>
  new AppError("VALIDATION", message, details);
export const unauthorized = (message = "Please sign in to continue") =>
  new AppError("UNAUTHORIZED", message);
export const forbidden = (message = "You do not have access to this resource") =>
  new AppError("FORBIDDEN", message);
export const notFound = (message = "Not found") => new AppError("NOT_FOUND", message);
export const conflict = (message: string) => new AppError("CONFLICT", message);
export const unavailable = (message: string, details?: Record<string, string>) =>
  new AppError("UNAVAILABLE", message, details);

export function toErrorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      { error: error.message, code: error.code, details: error.details },
      { status: error.status },
    );
  }
  console.error("[api] unhandled error", error);
  return Response.json(
    { error: "Something went wrong on our side. Please try again.", code: "INTERNAL" },
    { status: 500 },
  );
}

export function messageOf(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
