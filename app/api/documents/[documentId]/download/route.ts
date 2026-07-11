import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { documentId: string } }) {
  try {
    const result = await pool.query(
      `SELECT file_name, mime_type, file_data FROM documents WHERE document_id = $1 AND deleted_at IS NULL`,
      [params.documentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = result.rows[0];
    return new NextResponse(doc.file_data, {
      headers: {
        'Content-Type': doc.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${doc.file_name}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
