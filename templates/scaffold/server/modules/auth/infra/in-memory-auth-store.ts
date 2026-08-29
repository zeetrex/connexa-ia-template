// UserRepository y RoleRepository en memoria implementan ports distintos,
// pero en Postgres las dos leen/escriben las mismas tablas puente
// (user_role) — un store compartido por referencia evita que, por ejemplo,
// deleteRole() no vea las asignaciones que hizo InMemoryUserRepository.
export interface StoredUser {
  id: number;
  googleSub: string;
  email: string;
  name: string;
  pictureUrl: string | null;
  active: boolean;
  lastLoginAt: Date | null;
}

export interface StoredRole {
  id: number;
  name: string;
  description: string;
  active: boolean;
  protected: boolean;
  permissionCodes: Set<string>;
}

export class InMemoryAuthStore {
  nextId = 1;
  usersById = new Map<number, StoredUser>();
  usersByGoogleSub = new Map<string, number>();
  rolesById = new Map<number, StoredRole>();
  userRoles = new Map<number, Set<number>>();
}
