export type AppErrorKind =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "DATABASE"
  | "INTERNAL";

export class AppError extends Error {
  readonly kind: AppErrorKind;

  readonly reason?: string;

  constructor(kind: AppErrorKind, message: string, reason?: string) {
    super(message);
    this.name = "AppError";
    this.kind = kind;
    this.reason = reason;
  }
}

export class UnauthenticatedError extends AppError {
  constructor(reason?: string) {
    super("UNAUTHENTICATED", "Anda perlu masuk untuk melanjutkan.", reason);
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(reason?: string) {
    super("FORBIDDEN", "Anda tidak memiliki akses untuk tindakan ini.", reason);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Data tidak ditemukan.", reason?: string) {
    super("NOT_FOUND", message, reason);
    this.name = "NotFoundError";
  }
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      kind: AppErrorKind;
      fieldErrors?: Record<string, string[]>;
    };

export function ok(): ActionResult<void>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | void> {
  return { success: true, data: data as T };
}

export function fail(
  error: unknown,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      kind: error.kind,
      ...(fieldErrors ? { fieldErrors } : {}),
    };
  }

  console.error("[mipnu] unexpected error", error);

  return {
    success: false,
    error: "Terjadi kesalahan. Silakan coba lagi.",
    kind: "INTERNAL",
  };
}
