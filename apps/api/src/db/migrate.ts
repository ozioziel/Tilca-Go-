import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pool } from './pool'

/** Aplica en orden los .sql de migrations/ que aún no se ejecutaron. */
export async function migrate() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`)
  const dir = join(import.meta.dirname, 'migrations')
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
  const { rows } = await pool.query<{ name: string }>('SELECT name FROM schema_migrations')
  const done = new Set(rows.map((r) => r.name))
  for (const file of files) {
    if (done.has(file)) continue
    const sql = await readFile(join(dir, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`✓ ${file}`)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
