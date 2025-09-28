-- +migrate Up
-- Fix the businesses table id sequence to avoid primary key conflicts

-- Reset the sequence to the maximum existing id + 1
SELECT setval('businesses_id_seq', COALESCE((SELECT MAX(id) FROM businesses), 0) + 1, false);

-- +migrate Down
-- No rollback needed for sequence fix
