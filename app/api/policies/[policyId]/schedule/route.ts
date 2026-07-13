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

export async function GET(req: Request, { params }: { params: { policyId: string } }) {
  try {
    const policyResult = await pool.query(
      `SELECT p.policy_number, p.premium, p.sum_insured, p.status, p.inception_date, p.renewal_date,
              c.name AS client_name, c.contact_email, pr.name AS product_name, i.name AS insurer_name, i.fsp_license_number
       FROM policies p
       JOIN clients c ON c.client_id = p.client_id
       JOIN products pr ON pr.product_id = p.product_id
       LEFT JOIN insurers i ON i.insurer_id = p.insurer_id
       WHERE p.policy_id = $1`,
      [params.policyId]
    );

    if (policyResult.rows.length === 0) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }
    const policy = policyResult.rows[0];

    const assetsResult = await pool.query(
      `SELECT asset_type, description, sum_insured FROM insured_assets WHERE policy_id = $1 AND status = 'active'`,
      [params.policyId]
    );

    const coInsuredsResult = await pool.query(
      `SELECT name, relationship FROM co_insureds WHERE policy_id = $1`,
      [params.policyId]
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.registerFont('Body', FONT_REGULAR);
    doc.registerFont('Heading', FONT_BOLD);
    doc.font('Body');

    doc.font('Heading').fontSize(20).text('HelmAssured', { continued: false });
    doc.font('Body').fontSize(10).fillColor('#64748B').text('Policy Schedule').moveDown(1.5);

    doc.fillColor('#000000').fontSize(12).text(`Policy Number: ${policy.policy_number}`);
    doc.fontSize(10).fillColor('#64748B');
    doc.text(`Status: ${policy.status}`);
    doc.text(`Insurer: ${policy.insurer_name || 'Not assigned'}${policy.fsp_license_number ? ` (FSP ${policy.fsp_license_number})` : ''}`);
    doc.text(`Product: ${policy.product_name}`);
    doc.moveDown(1);

    doc.fillColor('#000000').fontSize(11).text('Insured');
    doc.fontSize(10).fillColor('#64748B');
    doc.text(policy.client_name);
    doc.text(policy.contact_email || '');
    doc.moveDown(1);

    doc.fillColor('#000000').fontSize(11).text('Cover Details');
    doc.fontSize(10).fillColor('#64748B');
    doc.text(`Premium: R ${policy.premium || '0.00'} / month`);
    if (policy.sum_insured) doc.text(`Sum Insured: R ${policy.sum_insured}`);
    if (policy.inception_date) doc.text(`Inception Date: ${new Date(policy.inception_date).toLocaleDateString()}`);
    if (policy.renewal_date) doc.text(`Renewal Date: ${new Date(policy.renewal_date).toLocaleDateString()}`);
    doc.moveDown(1);

    if (assetsResult.rows.length > 0) {
      doc.fillColor('#000000').fontSize(11).text('Insured Items');
      doc.fontSize(10).fillColor('#64748B');
      assetsResult.rows.forEach((a) => {
        doc.text(`${a.asset_type} — ${a.description} — R ${a.sum_insured}`);
      });
      doc.moveDown(1);
    }

    if (coInsuredsResult.rows.length > 0) {
      doc.fillColor('#000000').fontSize(11).text("Co-Insured's");
      doc.fontSize(10).fillColor('#64748B');
      coInsuredsResult.rows.forEach((c) => {
        doc.text(`${c.name} (${c.relationship})`);
      });
      doc.moveDown(1);
    }

    doc.fontSize(8).fillColor('#94A3B8').text(`Generated ${new Date().toLocaleString()} — real data, not a template.`, { align: 'left' });

    doc.end();
    const pdfBuffer = await streamToBuffer(doc);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${policy.policy_number}-schedule.pdf"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
