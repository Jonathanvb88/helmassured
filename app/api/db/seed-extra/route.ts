import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

async function seedExtra() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO reinsurance_treaties (treaty_type, period_start, period_end, capacity, utilisation) VALUES
      ('quota_share', '2026-01-01', '2026-12-31', 60000000, 42100000),
      ('facultative', '2026-01-01', '2026-12-31', 20000000, 17800000),
      ('non_proportional', '2026-01-01', '2026-12-31', 100000000, 96400000);
    `);

    await client.query(`
      INSERT INTO treaty_placements (treaty_id, policy_id, section, placed_amount)
      SELECT t.treaty_id, p.policy_id, 'Fleet - Section 3', 2400000
      FROM reinsurance_treaties t, policies p
      WHERE t.treaty_type='facultative' AND p.policy_number='POL-88176';
    `);

    await client.query(`
      INSERT INTO notification_templates (notification_type, subject, body) VALUES
      ('birthday', 'Happy Birthday!', 'Hi {{name}}, wishing you a wonderful birthday from all of us at HelmAssured.'),
      ('renewal_reminder', 'Your policy renews soon', 'Hi {{name}}, your policy {{policy_number}} renews on {{renewal_date}}.'),
      ('custom_nudge', 'Following up', 'Hi {{name}}, just checking in on an outstanding item.');
    `);

    await client.query(`
      INSERT INTO notifications (client_id, policy_id, template_id, notification_type, send_mode, status, scheduled_for)
      SELECT c.client_id, p.policy_id, nt.template_id, 'birthday', 'auto', 'scheduled', now() + interval '3 days'
      FROM clients c JOIN policies p ON p.client_id = c.client_id, notification_templates nt
      WHERE c.name='N. Petersen' AND nt.notification_type='birthday' LIMIT 1;
    `);

    await client.query(`
      INSERT INTO notifications (client_id, policy_id, template_id, notification_type, send_mode, status, scheduled_for)
      SELECT c.client_id, p.policy_id, nt.template_id, 'renewal_reminder', 'auto', 'scheduled', now() + interval '30 days'
      FROM clients c JOIN policies p ON p.client_id = c.client_id, notification_templates nt
      WHERE c.name='R. Botha' AND nt.notification_type='renewal_reminder' LIMIT 1;
    `);

    await client.query(`
      INSERT INTO notifications (client_id, policy_id, template_id, notification_type, send_mode, status, scheduled_for)
      SELECT c.client_id, NULL, nt.template_id, 'custom_nudge', 'manual', 'held', now() + interval '1 days'
      FROM clients c, notification_templates nt
      WHERE c.name='T. Mahlangu' AND nt.notification_type='custom_nudge' LIMIT 1;
    `);

    await client.query(`
      INSERT INTO commission_statements (broker_id, period_start, period_end, total_commission, status)
      SELECT broker_id, '2026-07-01', '2026-07-31', 61920, 'draft' FROM brokers WHERE name='K. Naidoo Underwriters';
    `);
    await client.query(`
      INSERT INTO commission_statements (broker_id, period_start, period_end, total_commission, status)
      SELECT broker_id, '2026-07-01', '2026-07-31', 180690, 'issued' FROM brokers WHERE name='Coastal Risk Brokers';
    `);

    await client.query('COMMIT');
    return { status: 'Extra seed data (reinsurance, notifications, commission) inserted successfully.' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function GET() {
  try {
    const result = await seedExtra();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: message, hint: 'If this says duplicate key or already exists, extra seed already applied — safe to ignore.' },
      { status: 500 }
    );
  }
}
