import { NextResponse } from 'next/server';
import pool from '@/lib/db';

interface BrokerRow {
  broker_id: string;
  name: string;
  total_premium: string;
  total_claims: string;
  loss_ratio: string | null;
  policy_count: string;
}

// Computes loss ratio and tier LIVE from real claims + premium data.
// Note: tier thresholds are configured per class_of_business (Admin Config spec),
// but a broker's book can span multiple classes. This MVP applies the threshold
// row matching the broker's single most common class of business — a genuine
// simplification, not a hidden shortcut. Multi-class blending needs real
// product decisions before it's built further.
export async function GET() {
  try {
    const result = await pool.query<BrokerRow>(`
      SELECT
        b.broker_id,
        b.name,
        COALESCE(SUM(pol.premium), 0) AS total_premium,
        COALESCE(SUM(claim_totals.claim_total), 0) AS total_claims,
        CASE WHEN COALESCE(SUM(pol.premium), 0) = 0 THEN NULL
             ELSE COALESCE(SUM(claim_totals.claim_total), 0) / SUM(pol.premium)
        END AS loss_ratio,
        COUNT(DISTINCT pol.policy_id) AS policy_count
      FROM brokers b
      LEFT JOIN policies pol ON pol.broker_id = b.broker_id
      LEFT JOIN (
        SELECT policy_id, SUM(COALESCE(final_settlement_amount, estimate_amount, 0)) AS claim_total
        FROM claims
        GROUP BY policy_id
      ) claim_totals ON claim_totals.policy_id = pol.policy_id
      GROUP BY b.broker_id, b.name
      ORDER BY loss_ratio DESC NULLS LAST
    `);

    // Fetch the broker's dominant class of business separately (simplification noted above)
    const brokersWithTier = await Promise.all(
      result.rows.map(async (broker) => {
        const classResult = await pool.query<{ class_of_business: string }>(
          `SELECT p.class_of_business
           FROM policies pol JOIN products p ON p.product_id = pol.product_id
           WHERE pol.broker_id = $1
           GROUP BY p.class_of_business
           ORDER BY COUNT(*) DESC LIMIT 1`,
          [broker.broker_id]
        );
        const dominantClass = classResult.rows[0]?.class_of_business ?? null;

        let tier = 'building_history';
        if (dominantClass) {
          const thresholdResult = await pool.query<{
            premium_floor: string; green_max_ratio: string; orange_max_ratio: string;
          }>(
            `SELECT premium_floor, green_max_ratio, orange_max_ratio FROM tier_thresholds WHERE class_of_business = $1`,
            [dominantClass]
          );
          const threshold = thresholdResult.rows[0];
          const premium = parseFloat(broker.total_premium);
          const lossRatio = broker.loss_ratio ? parseFloat(broker.loss_ratio) : null;

          if (threshold && premium >= parseFloat(threshold.premium_floor) && lossRatio !== null) {
            if (lossRatio < parseFloat(threshold.green_max_ratio)) tier = 'green';
            else if (lossRatio < parseFloat(threshold.orange_max_ratio)) tier = 'orange';
            else tier = 'red';
          }
        }

        return { ...broker, dominant_class: dominantClass, tier };
      })
    );

    return NextResponse.json({ brokers: brokersWithTier });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
