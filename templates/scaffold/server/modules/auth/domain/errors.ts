export class RoleInUseError extends Error {
  constructor(public readonly roleId: number) {
    super(`El rol ${roleId} tiene usuarios asignados y no se puede borrar`);
    this.name = 'RoleInUseError';
  }
}

export class ProtectedRoleError extends Error {
  constructor(public readonly roleId: number) {
    super(`El rol ${roleId} está protegido y no se puede editar ni borrar`);
    this.name = 'ProtectedRoleError';
  }
}
