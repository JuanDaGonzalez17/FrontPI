/**
 * Cliente HTTP centralizado para la API de Cognia.
 *
 * Características:
 *  - URL base inyectada desde VITE_API_URL (ver .env.local).
 *  - Cabecera Authorization: Bearer <token> si hay JWT en localStorage.
 *  - Fallback a X-Student-Id: <uuid> (modo desarrollo sin auth).
 *  - Content-Type: application/json en todas las peticiones con body.
 *  - Intercepta respuestas con status >= 400 y lanza ApiError (RFC 7807).
 */

import type { ApiError } from './types';

// ---------------------------------------------------------------------------
// Constantes de entorno
// ---------------------------------------------------------------------------

const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1';
const DEFAULT_STUDENT_ID: string =
  import.meta.env.VITE_DEFAULT_STUDENT_ID ?? '30000000-0000-0000-0000-000000000001';

// ---------------------------------------------------------------------------
// Clase de error tipada
// ---------------------------------------------------------------------------

export class CogniaApiError extends Error {
  public readonly apiError: ApiError;

  constructor(apiError: ApiError) {
    super(apiError.detail || apiError.title);
    this.name = 'CogniaApiError';
    this.apiError = apiError;
  }
}

// ---------------------------------------------------------------------------
// Helpers de autenticación
// ---------------------------------------------------------------------------

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('cognia_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }

  // Modo desarrollo: usar X-Student-Id como identificador de estudiante
  const studentId = localStorage.getItem('cognia_student_id') ?? DEFAULT_STUDENT_ID;
  return { 'X-Student-Id': studentId };
}

// ---------------------------------------------------------------------------
// Cliente genérico tipado
// ---------------------------------------------------------------------------

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/**
 * Realiza una petición HTTP tipada a la API de Cognia.
 *
 * @param path   - Ruta relativa a VITE_API_URL (ej. "/subjects")
 * @param options - Opciones de fetch extendidas (body acepta cualquier objeto)
 * @returns       Promesa con la respuesta deserializada como T
 * @throws CogniaApiError si el servidor devuelve status >= 400
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(extraHeaders as Record<string, string>),
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Respuestas vacías (204 No Content, 201 sin body, etc.)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as unknown as T;
  }

  // Intentar parsear el body (puede ser JSON o texto)
  let data: unknown;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json') || contentType.includes('application/problem+json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  // Manejo de errores RFC 7807 (ProblemDetail de Spring Boot)
  if (!response.ok) {
    const apiError = data as ApiError;

    // Garantizar campos mínimos aunque el backend no cumpla el estándar
    const normalizedError: ApiError = {
      type: apiError?.type,
      title: apiError?.title ?? response.statusText,
      status: apiError?.status ?? response.status,
      detail: apiError?.detail ?? `Error ${response.status} en ${path}`,
      instance: apiError?.instance,
      invalidParams: apiError?.invalidParams,
    };

    throw new CogniaApiError(normalizedError);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Helpers de conveniencia
// ---------------------------------------------------------------------------

export const apiGet = <T>(path: string) => apiFetch<T>(path, { method: 'GET' });

export const apiPost = <T>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: 'POST', body });

export const apiPut = <T>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: 'PUT', body });

export const apiDelete = <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' });
