/** Sesión en memoria del proceso principal (Electron). */
export type AuthSession = {
  usuarioId: number;
  username: string;
  nombre: string;
  rolId: number;
  rolNombre: string;
};

let currentSession: AuthSession | null = null;

export function setAuthSession(session: AuthSession | null): void {
  currentSession = session;
}

export function getAuthSession(): AuthSession | null {
  return currentSession;
}

export function assertAuthenticated(): AuthSession {
  if (!currentSession) {
    throw new Error('Sesión no iniciada. Inicia sesión para continuar.');
  }
  return currentSession;
}

export function assertSuperAdmin(): AuthSession {
  const s = assertAuthenticated();
  if (s.rolNombre !== 'SuperAdmin') {
    throw new Error('Solo el SuperAdmin puede realizar esta acción.');
  }
  return s;
}

/** Bloquea al rol Cajero (solo ventas + perfil en UI; el resto del panel no aplica). */
export function assertNotCajero(): void {
  const s = assertAuthenticated();
  if (s.rolNombre === 'Cajero') {
    throw new Error('No autorizado.');
  }
}
