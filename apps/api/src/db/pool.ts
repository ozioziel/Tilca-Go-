import pg from 'pg'
import { config } from '../config'

// BIGINT (int8) se lee como bigint de JS: los montos nunca pasan por float
pg.types.setTypeParser(20, (v) => BigInt(v))

export const pool = new pg.Pool({ connectionString: config.DATABASE_URL })

export type Db = pg.Pool | pg.PoolClient

/** Ejecuta `fn` dentro de una transacción; hace rollback si lanza. */
export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function audit(db: Db, actor: string, action: string, resourceId: string | null, data?: unknown) {
  await db.query('INSERT INTO audit_logs (actor, action, resource_id, data) VALUES ($1, $2, $3, $4)', [
    actor,
    action,
    resourceId,
    data === undefined ? null : JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
  ])
}
