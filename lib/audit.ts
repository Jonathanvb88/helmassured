import pool from './db';

// Writes a real row to audit_log. This table existed in the schema since the
// beginning but nothing ever called this — it was silently empty. Every
// mutation that matters for compliance (claims decisions, underwriting
// outcomes, threshold changes, SIU case actions) should call this.
export async function logAudit(params: {
  entityType: string;
  entityId: string;
  event: string;
  details?: Record<string, unknown>;
}) {
  await pool.query(
    `INSERT INTO audit_log (entity_type, entity_id, event, details) VALUES ($1, $2, $3, $4)`,
    [params.entityType, params.entityId, params.event, JSON.stringify(params.details || {})]
  );
}
