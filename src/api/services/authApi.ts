/**
 * authApi.ts
 * Servicio de autenticación para Cognia.
 *
 * Ciclo:
 *   1. login(email, password)              → obtiene JWT + info del estudiante
 *   2. register(email, password, fullName) → registra y devuelve JWT
 *   3. getMe()                             → obtiene el perfil del estudiante autenticado
 */

import { apiFetch, apiGet, apiPost } from '../client';

// ---------------------------------------------------------------------------
// DTOs de autenticación
// ---------------------------------------------------------------------------

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponseDto {
  token: string;
  studentId: string;
  fullName: string;
  email: string;
}

export interface RegisterResponseDto {
  studentId: string;
  fullName: string;
  email: string;
}

export interface StudentDto {
  id: string;
  fullName: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Funciones de autenticación
// ---------------------------------------------------------------------------

/**
 * Inicia sesión con email y contraseña.
 * Guarda el token y studentId en localStorage automáticamente.
 */
export async function login(email: string, password: string): Promise<AuthResponseDto> {
  const res = await apiPost<AuthResponseDto>('/auth/login', { email, password });
  localStorage.setItem('cognia_token', res.token);
  localStorage.setItem('cognia_student_id', res.studentId);
  localStorage.setItem('cognia_student_name', res.fullName);
  return res;
}

/**
 * Registra un nuevo estudiante. El endpoint devuelve la cuenta, pero no un JWT;
 * el inicio de sesión se realiza después desde AuthContext.
 */
export function register(email: string, password: string, fullName: string): Promise<RegisterResponseDto> {
  return apiPost<RegisterResponseDto>('/auth/register', { email, password, fullName });
}

/**
 * Obtiene el perfil del estudiante actualmente autenticado.
 */
export function getMe(): Promise<StudentDto> {
  return apiGet<{ studentId: string; fullName: string; email: string }>('/auth/me').then((profile) => ({
    id: profile.studentId,
    fullName: profile.fullName,
    email: profile.email,
  }));
}

/**
 * Solicita el cierre de sesión al backend. El token se elimina localmente
 * aunque el backend no esté disponible.
 */
export async function logout(token: string | null = localStorage.getItem('cognia_token')): Promise<void> {
  try {
    if (token) {
      await apiFetch<void>('/auth/logout', {
        method: 'POST',
        body: {},
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } finally {
    clearLocalAuth();
  }
}

/** Elimina todas las credenciales y datos de identidad guardados localmente. */
export function clearLocalAuth(): void {
  localStorage.removeItem('cognia_token');
  localStorage.removeItem('cognia_student_id');
  localStorage.removeItem('cognia_student_name');
}

/**
 * Devuelve true si hay una sesión activa (token o student-id en dev).
 */
export function isAuthenticated(): boolean {
  return !!(localStorage.getItem('cognia_token') || localStorage.getItem('cognia_student_id'));
}

/**
 * Devuelve el nombre del estudiante guardado en localStorage, o null.
 */
export function getStoredName(): string | null {
  return localStorage.getItem('cognia_student_name');
}
