-- Up Migration
--
-- Modelo de auth y permisos. `role.protected` incluido desde el día uno —
-- es un flag, nunca se decide por nombre de rol (ver domain/errors.ts §6.4
-- y requirements.md §6).

CREATE TABLE app_user (
  id            BIGSERIAL     PRIMARY KEY,
  google_sub    VARCHAR(255)  NOT NULL UNIQUE,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  name          VARCHAR(255)  NOT NULL DEFAULT '',
  picture_url   TEXT,
  active        BOOLEAN       NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE role (
  id          BIGSERIAL     PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL UNIQUE,
  description TEXT          NOT NULL DEFAULT '',
  active      BOOLEAN       NOT NULL DEFAULT true,
  protected   BOOLEAN       NOT NULL DEFAULT false
);

CREATE TABLE permission (
  code        VARCHAR(100)  PRIMARY KEY,
  description TEXT          NOT NULL DEFAULT ''
);

CREATE TABLE role_permission (
  role_id         BIGINT       NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_code VARCHAR(100) NOT NULL REFERENCES permission(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE user_role (
  user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Catálogo base — sumar filas acá en migraciones de seguimiento a medida
-- que se agreguen módulos/permisos reales del proyecto. Esta tabla es
-- infraestructura compartida por diseño (ver plan.md §6): cualquier módulo
-- puede extenderla vía su propia migración sin violar el principio de
-- bajo acoplamiento entre módulos, que es sobre código de aplicación,
-- no sobre datos.
INSERT INTO permission (code, description) VALUES
  ('user.view', 'Ver usuarios y sus roles'),
  ('user.edit', 'Activar/inactivar usuarios, asignarles roles'),
  ('role.view',   'Ver roles y sus permisos'),
  ('role.create', 'Crear roles'),
  ('role.edit',   'Editar el set de permisos de un rol'),
  ('role.delete', 'Borrar roles'),
  ('diagnostics.view', 'Ver el endpoint de diagnóstico del sistema');

INSERT INTO role (name, description, protected) VALUES ('Admin', 'Acceso total, seed inicial', true);
INSERT INTO role_permission (role_id, permission_code)
  SELECT (SELECT id FROM role WHERE name = 'Admin'), code FROM permission;

-- Down Migration

DROP TABLE IF EXISTS user_role;
DROP TABLE IF EXISTS role_permission;
DROP TABLE IF EXISTS permission;
DROP TABLE IF EXISTS role;
DROP TABLE IF EXISTS app_user;
