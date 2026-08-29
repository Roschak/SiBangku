import { createControlPlaneDb } from '@sibangku/db';

const connectionString =
  process.env.CONTROL_DATABASE_URL ||
  'postgresql://sibangku:sibangku_dev@localhost:5432/sibangku_control';

export const db = createControlPlaneDb(connectionString);
