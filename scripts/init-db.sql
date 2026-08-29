-- SiBangku Database Initialization
-- This script runs on first PostgreSQL container start.
-- It creates the control plane database (already created by POSTGRES_DB env)
-- and prepares the environment for tenant databases.

-- Ensure we can create tenant databases dynamically
-- The control plane DB is created automatically by the POSTGRES_DB env var.

-- Grant necessary privileges
GRANT ALL PRIVILEGES ON DATABASE sibangku_control TO sibangku;
