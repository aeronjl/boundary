import { migrate } from 'drizzle-orm/libsql/migrator';
import { closeDatabase, db } from '../src/lib/server/db';

await migrate(db, { migrationsFolder: './drizzle' });
await closeDatabase();

console.log('Database migrations applied.');
