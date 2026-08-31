/**
 * Taksonomi error aplikasi.
 *
 * Dipisah supaya lapisan pemanggil dapat membedakan "belum login" dari
 * "login tapi tidak berhak" tanpa mengurai string pesan, dan supaya pesan
 * yang sampai ke pengguna tidak pernah membocorkan struktur internal
 * (SYSTEM.md §58, PERMISSIONS.md §96-§97).
 */

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

  /**
   * Alasan internal untuk log/audit, mis. "cross_tenant".
   * Tidak pernah ditampilkan ke pengguna.
   */
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

/**
 * Hasil operasi yang dikembalikan Server Action ke UI.
 *
 * Satu bentuk untuk seluruh fitur supaya form dapat menangani error dengan
 * cara yang sama (SYSTEM.md §59).
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      kind: AppErrorKind;
      /** Error per field dari validasi Zod, untuk ditampilkan inline. */
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

  // Error tak terduga: catat detailnya untuk operator, kembalikan pesan aman
  // ke pengguna. Stack trace, SQL, dan token tidak pernah keluar.
  console.error("[mipnu] unexpected error", error);

  return {
    success: false,
    error: "Terjadi kesalahan. Silakan coba lagi.",
    kind: "INTERNAL",
  };
}
