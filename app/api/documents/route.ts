import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const VALID_ENTITY_TYPES = ['policy', 'claim', 'client', 'broker'];
const VALID_CATEGORIES = ['policy_schedule', 'id_document', 'claim_photo', 'correspondence', 'other'];

export async function GET(req: NextRequest) {
  const entityType = req.nextUrl.searchParams.get('entity_type');
  const entityId = req.nextUrl.searchParams.get('entity_id');

  try {
    let result;
    if (entityType && entityId) {
      result = await pool.query(
        `SELECT document_id, entity_type, entity_id, category, file_name, mime_type, file_size_bytes, created_at
         FROM documents WHERE entity_type = $1 AND entity_id = $2 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [entityType, entityId]
      );
    } else {
      result = await pool.query(
        `SELECT document_id, entity_type, entity_id, category, file_name, mime_type, file_size_bytes, created_at
         FROM documents WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 50`
      );
    }
    return NextResponse.json({ documents: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Real upload — accepts base64-encoded file content and stores actual bytes in Postgres.
// Note: bytea-in-Postgres works fine for the document sizes here, but a production
// build at scale should move actual file bytes to object storage (Vercel Blob/S3) and
// keep only metadata + a storage key in this table. Flagging that honestly rather
// than pretending Postgres bytea is the final answer for large volumes.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entity_type, entity_id, category, file_name, mime_type, file_data_base64 } = body;

    if (!VALID_ENTITY_TYPES.includes(entity_type)) {
      return NextResponse.json({ error: `entity_type must be one of ${VALID_ENTITY_TYPES.join(', ')}` }, { status: 400 });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `category must be one of ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });
    }
    if (!file_data_base64 || !file_name || !entity_id) {
      return NextResponse.json({ error: 'entity_id, file_name, and file_data_base64 are required' }, { status: 400 });
    }

    const buffer = Buffer.from(file_data_base64, 'base64');

    const result = await pool.query(
      `INSERT INTO documents (entity_type, entity_id, category, file_name, mime_type, file_size_bytes, file_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING document_id, file_name, file_size_bytes, created_at`,
      [entity_type, entity_id, category, file_name, mime_type || 'application/octet-stream', buffer.length, buffer]
    );

    return NextResponse.json({ document: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
