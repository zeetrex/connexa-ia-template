-- Up Migration

CREATE TABLE {{EXAMPLE_ENTITY_TABLE}} (
  id          BIGSERIAL     PRIMARY KEY,
  title       VARCHAR(200)  NOT NULL,
  description TEXT          NOT NULL DEFAULT '',
  status      VARCHAR(20)   NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

INSERT INTO permission (code, description) VALUES
  ('{{EXAMPLE_MODULE_NAME}}.view',   'Ver {{EXAMPLE_MODULE_NAME_PASCAL}}'),
  ('{{EXAMPLE_MODULE_NAME}}.create', 'Crear {{EXAMPLE_MODULE_NAME_PASCAL}}'),
  ('{{EXAMPLE_MODULE_NAME}}.edit',   'Editar {{EXAMPLE_MODULE_NAME_PASCAL}}'),
  ('{{EXAMPLE_MODULE_NAME}}.delete', 'Borrar {{EXAMPLE_MODULE_NAME_PASCAL}}');

INSERT INTO role_permission (role_id, permission_code)
  SELECT (SELECT id FROM role WHERE name = 'Admin'), code
    FROM permission WHERE code LIKE '{{EXAMPLE_MODULE_NAME}}.%';

-- Down Migration

DELETE FROM role_permission WHERE permission_code LIKE '{{EXAMPLE_MODULE_NAME}}.%';
DELETE FROM permission WHERE code LIKE '{{EXAMPLE_MODULE_NAME}}.%';
DROP TABLE IF EXISTS {{EXAMPLE_ENTITY_TABLE}};
