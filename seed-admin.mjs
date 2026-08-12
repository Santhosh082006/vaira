import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const connectionString = "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";
const pool = new Pool({ connectionString });

async function main() {
  const hash = await bcrypt.hash('password', 10);
  
  // Try to insert the admin user, ignoring duplicate key errors
  try {
    await pool.query(`
      INSERT INTO "User" (id, email, name, "passwordHash", role, "createdAt", "updatedAt")
      VALUES ('admin-e2e', 'admin@vaira.app', 'System Admin', $1, 'ADMIN', NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET "passwordHash" = $1, role = 'ADMIN'
    `, [hash]);
    console.log('Admin user seeded successfully');
  } catch (e) {
    console.error('Error seeding user:', e);
  } finally {
    await pool.end();
  }
}

main();
