import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Override default pg DATE (OID 1082) parser to return plain date strings (YYYY-MM-DD) 
// instead of instantiating timezone-dependent JS Date objects at local midnight.
// This prevents off-by-one errors when running on systems in positive/negative timezone offsets.
pg.types.setTypeParser(1082, (val) => val);

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("WARNING: DATABASE_URL environment variable is not defined. Falling back to local postgres default.");
}

export const pool = new Pool({
  connectionString: connectionString || 'postgresql://postgres:postgres@localhost:5432/takhleeq',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 15000,
  max: 20, // max clients in pool
  idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});
