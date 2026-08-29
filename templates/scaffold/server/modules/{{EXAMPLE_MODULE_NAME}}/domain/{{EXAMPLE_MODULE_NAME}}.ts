export type {{EXAMPLE_MODULE_NAME_PASCAL}}Status = 'pending' | 'done';

export interface {{EXAMPLE_MODULE_NAME_PASCAL}} {
  id: number;
  title: string;
  description: string;
  status: {{EXAMPLE_MODULE_NAME_PASCAL}}Status;
  createdAt: Date;
}

export interface New{{EXAMPLE_MODULE_NAME_PASCAL}} {
  title: string;
  description: string;
}

export function validateTitle(title: string): string | null {
  if (!title || title.trim().length === 0) return 'title no puede estar vacío';
  if (title.length > 200) return 'title no puede superar 200 caracteres';
  return null;
}
