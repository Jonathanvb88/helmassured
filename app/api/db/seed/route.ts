import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Seeds the same realistic dataset used for local validation throughout development —
// not placeholder rows, but the actual K. Naidoo Underwriters / Coastal Risk Brokers
// scenario with a genuinely bad loss ratio, a clean policy, and real claims.
async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO users (name, role, email, password_hash) VALUES
      ('J. van Blerk', 'Superuser', 'jonathan@urupconnect.com', '$2b$10$21h4OVoAHOrCLsYY.rkSRuHk6hrXVW6QL9vNXozwn2l77n2EI56Ca')
      ON CONFLICT (email) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO brokers (name, tier, loss_ratio, tier_calculated_at) VALUES
      ('K. Naidoo Underwriters', 'red', 1.02, now()),
      ('Coastal Risk Brokers', 'green', 0.41, now());
    `);

    await client.query(`
      INSERT INTO clients (broker_id, name, date_of_birth, contact_email)
      SELECT broker_id, 'N. Petersen', '1985-06-01', 'n.petersen@example.co.za' FROM brokers WHERE name='K. Naidoo Underwriters';
    `);
    await client.query(`
      INSERT INTO clients (broker_id, name, date_of_birth, contact_email)
      SELECT broker_id, 'T. Mahlangu', '1990-11-20', 't.mahlangu@example.co.za' FROM brokers WHERE name='K. Naidoo Underwriters';
    `);
    await client.query(`
      INSERT INTO clients (broker_id, name, date_of_birth, contact_email)
      SELECT broker_id, 'R. Botha', '1978-03-14', 'r.botha@example.co.za' FROM brokers WHERE name='K. Naidoo Underwriters';
    `);
    await client.query(`
      INSERT INTO clients (broker_id, name, date_of_birth, contact_email)
      SELECT broker_id, 'L. Fourie', '1982-02-02', 'l.fourie@example.co.za' FROM brokers WHERE name='Coastal Risk Brokers';
    `);

    await client.query(`
      INSERT INTO products (name, class_of_business, status, effective_date) VALUES
      ('Motor Comprehensive', 'Motor - Private', 'live', '2026-01-01'),
      ('Commercial Fleet', 'Commercial Fleet', 'live', '2026-01-01');
    `);

    await client.query(`
      INSERT INTO product_fields (product_id, field_name, field_type, display_order)
      SELECT product_id, 'Vehicle registration number', 'text', 1 FROM products WHERE name='Motor Comprehensive';
    `);
    await client.query(`
      INSERT INTO product_fields (product_id, field_name, field_type, display_order)
      SELECT product_id, 'Vehicle usage type', 'select', 2 FROM products WHERE name='Motor Comprehensive';
    `);
    await client.query(`
      INSERT INTO product_fields (product_id, field_name, field_type, display_order)
      SELECT product_id, 'Estimated annual mileage', 'number', 3 FROM products WHERE name='Motor Comprehensive';
    `);

    await client.query(`
      INSERT INTO rate_tables (product_id, band_label, base_premium, excess)
      SELECT product_id, 'Under R150k', 650, 5000 FROM products WHERE name='Motor Comprehensive';
    `);
    await client.query(`
      INSERT INTO rate_tables (product_id, band_label, base_premium, excess)
      SELECT product_id, 'R150k-R350k', 1240, 7500 FROM products WHERE name='Motor Comprehensive';
    `);

    await client.query(`
      INSERT INTO product_versions (product_id, version_number, status, published_at)
      SELECT product_id, 12, 'published', '2026-03-19' FROM products WHERE name='Motor Comprehensive';
    `);
    await client.query(`
      INSERT INTO product_versions (product_id, version_number, status, published_at)
      SELECT product_id, 13, 'published', '2026-05-02' FROM products WHERE name='Motor Comprehensive';
    `);
    await client.query(`UPDATE products SET current_version = 13 WHERE name='Motor Comprehensive';`);

    await client.query(`
      INSERT INTO policies (client_id, broker_id, product_id, policy_number, status, premium, inception_date, renewal_date)
      SELECT c.client_id, c.broker_id, p.product_id, 'POL-88213', 'active', 1240, '2025-06-01', '2026-06-01'
      FROM clients c, products p WHERE c.name='N. Petersen' AND p.name='Motor Comprehensive';
    `);
    await client.query(`
      INSERT INTO policies (client_id, broker_id, product_id, policy_number, status, premium, inception_date, renewal_date)
      SELECT c.client_id, c.broker_id, p.product_id, 'POL-88176', 'active', 8420, '2025-08-17', '2026-08-17'
      FROM clients c, products p WHERE c.name='R. Botha' AND p.name='Commercial Fleet';
    `);
    await client.query(`
      INSERT INTO policies (client_id, broker_id, product_id, policy_number, status, premium, inception_date, renewal_date)
      SELECT c.client_id, c.broker_id, p.product_id, 'POL-99001', 'active', 950, '2025-09-01', '2026-09-01'
      FROM clients c, products p WHERE c.name='L. Fourie' AND p.name='Motor Comprehensive';
    `);

    await client.query(`
      INSERT INTO policy_transactions (policy_id, transaction_type, transaction_date, premium_delta, description)
      SELECT policy_id, 'new_business', '2025-06-01', 1155, 'Policy incepted' FROM policies WHERE policy_number='POL-88213';
    `);
    await client.query(`
      INSERT INTO policy_transactions (policy_id, transaction_type, transaction_date, premium_delta, description)
      SELECT policy_id, 'endorsement', '2026-03-14', 85, 'Added driver' FROM policies WHERE policy_number='POL-88213';
    `);
    await client.query(`
      INSERT INTO policy_transactions (policy_id, transaction_type, transaction_date, premium_delta, description)
      SELECT policy_id, 'renewal', '2026-06-01', 1240, 'Renewal issued (+3.1%)' FROM policies WHERE policy_number='POL-88213';
    `);

    await client.query(`
      INSERT INTO claims (policy_id, status, incident_date, estimate_amount, final_settlement_amount, fraud_risk_tier, fraud_flag_reason, stp_eligible, stp_status, decision_outcome)
      SELECT policy_id, 'closed', '2026-06-27', 12000, 12000, 'high', 'Duplicate claim pattern detected within 90 days', false, 'manual_review', 'approved'
      FROM policies WHERE policy_number = 'POL-88176';
    `);
    await client.query(`
      INSERT INTO claims (policy_id, status, incident_date, description, estimate_amount, fraud_risk_tier, stp_eligible, stp_status)
      SELECT policy_id, 'fnol', '2026-07-10', 'Minor windscreen chip, low value repair', 850, 'low', true, 'routed_stp'
      FROM policies WHERE policy_number = 'POL-88213';
    `);
    await client.query(`
      INSERT INTO claim_payments (claim_id, amount, payment_date, payment_type)
      SELECT claim_id, 12000, '2026-06-30', 'payment' FROM claims WHERE policy_id = (SELECT policy_id FROM policies WHERE policy_number='POL-88176');
    `);

    await client.query(`
      INSERT INTO tier_thresholds (class_of_business, premium_floor, green_max_ratio, orange_max_ratio) VALUES
      ('Motor - Private', 100000, 0.60, 0.85),
      ('Commercial Fleet', 300000, 0.65, 0.90);
    `);

    await client.query(`
      INSERT INTO billing_runs (run_date, status, total_amount, policy_count) VALUES
      ('2026-07-01', 'processing', 9660, 2);
    `);
    await client.query(`
      INSERT INTO billing_transactions (run_id, policy_id, amount, status)
      SELECT br.run_id, pol.policy_id, 1240, 'success' FROM billing_runs br, policies pol WHERE pol.policy_number='POL-88213';
    `);
    await client.query(`
      INSERT INTO billing_transactions (run_id, policy_id, amount, status)
      SELECT br.run_id, pol.policy_id, 8420, 'pending' FROM billing_runs br, policies pol WHERE pol.policy_number='POL-88176';
    `);

    await client.query('COMMIT');
    return { status: 'Seed data inserted successfully.' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function GET() {
  try {
    const result = await seed();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: message, hint: 'If this says duplicate key, seed data already exists — safe to ignore.' },
      { status: 500 }
    );
  }
}
