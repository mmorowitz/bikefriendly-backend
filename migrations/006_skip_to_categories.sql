-- +migrate Up
-- Mark existing migrations as applied without running them
INSERT INTO schema_migrations (version) VALUES ('001') ON CONFLICT DO NOTHING;
INSERT INTO schema_migrations (version) VALUES ('002') ON CONFLICT DO NOTHING;

-- +migrate Down
-- Remove the migration markers
DELETE FROM schema_migrations WHERE version IN ('001', '002');

