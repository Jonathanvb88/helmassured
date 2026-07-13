import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import PDFDocument from 'pdfkit';
import path from 'path';

export const dynamic = 'force-dynamic';

const FONT_REGULAR = path.join(process.cwd(), 'lib', 'fonts', 'LiberationSans-Regular.ttf');
const FONT_BOLD = path.join(process.cwd(), 'lib', 'fonts', 'LiberationSans-Bold.ttf');

function streamToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

export async function GET(req: Request, { params }: { params: { groupId: string } }) {
  try {
    const optionsResult = await pool.query(
      `SELECT p.policy_number, p.status, p.premium, c.name AS client_name, pr.name AS product_name
       FROM policies p
       JOIN clients c ON c.client_id = p.client_id
       JOIN products pr ON pr.product_id = p.product_id
       WHERE p.quote_group_id = $1
       ORDER BY p.premium ASC`,
      [params.groupId]
    );

    if (optionsResult.rows.length === 0) {
      return NextResponse.json({ error: 'Quote group not found' }, { status: 404 });
    }

    const clientName = optionsResult.rows[0].client_name;
    const productName = optionsResult.rows[0].product_name;

    const doc = new PDFDocument({ margin: 50 });
    doc.registerFont('Body', FONT_REGULAR);
    doc.registerFont('Heading', FONT_BOLD);
    doc.font('Body');

    doc.font('Heading').fontSize(20).text('HelmAssured');
    doc.font('Body').fontSize(10).fillColor('#64748B').text('Quotation').moveDown(1.5);

    doc.fillColor('#000000').fontSize(12).text(`Dear ${clientName},`);
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#64748B').text(`Thank you for the opportunity to quote on your ${productName} requirements. The option(s) below are valid for 30 days from the date of this letter.`);
    doc.moveDown(1.5);

    optionsResult.rows.forEach((o, i) => {
      doc.fillColor('#000000').fontSize(11).text(`Option ${i + 1} — ${o.policy_number}`);
      doc.fontSize(10).fillColor('#64748B');
      doc.text(`Monthly premium: R ${o.premium}`);
      doc.text(`Status: ${o.status === 'quote' ? 'Open for acceptance' : o.status}`);
      doc.moveDown(1);
    });

    doc.fontSize(8).fillColor('#94A3B8').text(`Generated ${new Date().toLocaleString()} from real rate table data.`);

    doc.end();
    const pdfBuffer = await streamToBuffer(doc);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="quote-letter-${params.groupId.slice(0, 8)}.pdf"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
