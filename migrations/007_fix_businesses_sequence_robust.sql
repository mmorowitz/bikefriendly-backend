-- +migrate Up
-- Comprehensive fix for businesses table id sequence issues

-- First, let's see what we're working with
DO $$
DECLARE
    max_id INTEGER;
    seq_val INTEGER;
BEGIN
    -- Get the maximum id from the table
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM businesses;

    -- Get the current sequence value
    SELECT last_value INTO seq_val FROM businesses_id_seq;

    RAISE NOTICE 'Max ID in businesses table: %', max_id;
    RAISE NOTICE 'Current sequence value: %', seq_val;

    -- Reset the sequence to be higher than the max id
    PERFORM setval('businesses_id_seq', max_id + 1, false);

    RAISE NOTICE 'Sequence reset to: %', max_id + 1;
END $$;

-- Ensure the id column is properly set as a serial with the sequence
ALTER TABLE businesses ALTER COLUMN id SET DEFAULT nextval('businesses_id_seq');

-- Make sure the sequence is owned by the column
ALTER SEQUENCE businesses_id_seq OWNED BY businesses.id;

-- +migrate Down
-- No rollback needed - sequence fixes are safe to keep
