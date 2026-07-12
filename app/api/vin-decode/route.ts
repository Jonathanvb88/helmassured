import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// NHTSA vPIC is a genuinely free, keyless, public US government API — no signup,
// no rate limit, no auth. Real caveat, stated honestly: it's US-market data, so
// coverage for South African-specific trims/imports will be partial. Good for
// globally-sold models (Toyota, VW, Ford etc.), weaker for SA-only variants.

export async function GET(req: NextRequest) {
  const vin = req.nextUrl.searchParams.get('vin')?.trim().toUpperCase();

  if (!vin || vin.length !== 17) {
    return NextResponse.json({ error: 'A 17-character VIN is required' }, { status: 400 });
  }

  try {
    const nhtsaRes = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(vin)}?format=json`
    );

    if (!nhtsaRes.ok) {
      return NextResponse.json({ error: `NHTSA API returned ${nhtsaRes.status}` }, { status: 502 });
    }

    const data = await nhtsaRes.json();
    const row = data.Results?.[0];

    if (!row) {
      return NextResponse.json({ error: 'No decode result returned' }, { status: 502 });
    }

    // The flat-format response has one row with every field as a column —
    // pull out just the fields worth showing rather than dumping ~150 columns.
    const decoded: Record<string, string | null> = {
      make: row.Make || null,
      model: row.Model || null,
      model_year: row.ModelYear || null,
      vehicle_type: row.VehicleType || null,
      body_class: row.BodyClass || null,
      engine_cylinders: row.EngineCylinders || null,
      displacement_l: row.DisplacementL || null,
      fuel_type: row.FuelTypePrimary || null,
      drive_type: row.DriveType || null,
      plant_country: row.PlantCountry || null,
      error_text: row.ErrorText || null,
    };

    const hasData = decoded.make || decoded.model;

    return NextResponse.json({ vin, decoded, hasData, source: 'NHTSA vPIC (US market data — partial coverage for SA-specific vehicles)' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
