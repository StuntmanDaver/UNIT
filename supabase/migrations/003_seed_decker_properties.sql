-- UNIT Database Schema - Migration 003
-- Seed Decker Capital properties and units
-- Idempotent: uses ON CONFLICT DO NOTHING

-- ============================================================
-- VERO (VD Vero, LLC)
-- ============================================================

do $$
declare
  v_property_id uuid;
begin

  -- insert property
  insert into properties (name, address, city, state, total_units, type)
    values (
      'VD Vero, LLC',
      '652 Old Dixie Highway',
      'VERO BEACH',
      'FLORIDA',
      83,
      'commercial'
    )
    on conflict do nothing;

  select id into v_property_id
    from properties
    where name = 'VD Vero, LLC';

  -- insert units
  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B1-652',
      '652 Old Dixie Highway',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B1'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B1-654',
      '654 Old Dixie Highway',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B1'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B1-656',
      '656 Old Dixie Highway',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B1'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B1-658',
      '658 Old Dixie Highway',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B1'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B1-660',
      '660 Old Dixie Highway',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B1'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B1-664',
      '664 Old Dixie Highway',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B1'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B2-672',
      '672 Old Dixie Highway',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B2'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B2-676-F',
      '676 Old Dixie Highway',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B2'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B2-678-F',
      '678-F Old Dixie Highway',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B2'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B2-678-R',
      '678-R Old Dixie Highway',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B2'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B2-680',
      '680 Old Dixie Highway',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B2'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B2-682',
      '682 Old Dixie Highway',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B2'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B2-684',
      '684 Old Dixie Highway',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B2'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B2-686-F',
      '686-F Old Dixie Highway',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B2'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B2-686-R',
      '686-R Old Dixie Highway',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B2'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B3-827',
      '827 8th Street',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B3'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B3-829',
      '829 8th Street',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B3'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B3-831',
      '831 8th Street',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B3'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B3-833',
      '833 8th Street',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B3'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B3-835',
      '835 8th Street',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B3'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B3-837',
      '837 8th Street',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B3'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B3-839',
      '839 8th Street',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B3'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B3-841',
      '841 8th Street',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B3'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B3-843',
      '843 8th Street',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B3'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B3-845',
      '845 8th Street',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B3'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B3-847',
      '847 8th Street',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B3'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B4-795',
      '795 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B4'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B5-789-1',
      '789 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B5'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B5-789-2',
      '789 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B5'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B5-789-2',
      '789 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B5'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B6-785-1',
      '785 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B6'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B6-785-2',
      '785 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B6'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B6-785-3',
      '785 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B6'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B6-785-4',
      '785 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B6'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B6-785-5',
      '785 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B6'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B6-785-6',
      '785 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B6'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B6-785-7',
      '785 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B6'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B6-785-8',
      '785 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B6'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B7-775-1',
      '775 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B7'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B7-775-2',
      '775 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B7'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B7-775-3',
      '775 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B7'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B7-775-4',
      '775 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B7'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B7-775-5',
      '775 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B7'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B7-775-6',
      '775 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B7'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B7-775-7',
      '775 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B7'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B7-775-8',
      '775 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B7'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B8-755-1',
      '755 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B8'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B8-755-2',
      '755 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B8'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B8-755-3',
      '755 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B8'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B8-755-4',
      '755 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B8'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B8-755-5',
      '755 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B8'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B8-755-6',
      '755 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B8'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B8-755-7',
      '755 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B8'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B8-755-8',
      '755 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B8'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B9-683',
      '683 8th COURT',
      'STE VERO BEACH',
      'FLORIDA',
      '32962',
      'B9'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B9-685',
      '685 8th COURT',
      'STE VERO BEACH',
      'FLORIDA',
      '32962',
      'B9'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B9-697',
      '697 8th COURT',
      'STE VERO BEACH',
      'FLORIDA',
      '32962',
      'B9'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B9-699',
      '699 8th COURT',
      'STE VERO BEACH',
      'FLORIDA',
      '32962',
      'B9'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B9-701',
      '701 8th COURT',
      'STE VERO BEACH',
      'FLORIDA',
      '32962',
      'B9'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B10-670',
      '670 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B10'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B11-680',
      '680 8th COURT',
      'STE VERO BEACH',
      'FLORIDA',
      '32962',
      'B11'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B11-682',
      '682 8th COURT',
      'STE VERO BEACH',
      'FLORIDA',
      '32962',
      'B11'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B11-686',
      '686 8th COURT',
      'STE VERO BEACH',
      'FLORIDA',
      '32962',
      'B11'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B11-690',
      '690 8th COURT',
      'STE VERO BEACH',
      'FLORIDA',
      '32962',
      'B11'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B11-692',
      '692 8th COURT',
      'STE VERO BEACH',
      'FLORIDA',
      '32962',
      'B11'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B11-694',
      '694 8th COURT',
      'STE VERO BEACH',
      'FLORIDA',
      '32962',
      'B11'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B11-696',
      '696 8th COURT',
      'STE VERO BEACH',
      'FLORIDA',
      '32962',
      'B11'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B11-700',
      '700 8th COURT',
      'STE VERO BEACH',
      'FLORIDA',
      '32962',
      'B11'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B12-760-1-F',
      '760 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B12'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B12-760-2',
      '760 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B12'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B12-760-3',
      '760 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B12'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B12-760-4',
      '760 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B12'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B12-760-5',
      '760 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B12'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B12-760-6-R',
      '760 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B12'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B12-760-R',
      '760 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B12'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B12-760-7-F',
      '760 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B12'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '12-760-8-F',
      '760 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      '12'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B12-760-9',
      '760 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B12'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B12-760-10',
      '760 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B12'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B12-760-11',
      '760 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B12'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B12-760-12',
      '760 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B12'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B13-770-1',
      '770 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B13'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      'B13-770-2',
      '770 8th COURT',
      'VERO BEACH',
      'FLORIDA',
      '32962',
      'B13'
    )
    on conflict (property_id, unit_number) do nothing;

end;
$$;

-- ============================================================
-- DAYTONA 1 (VD Daytona 1 , LLC)
-- ============================================================

do $$
declare
  v_property_id uuid;
begin

  -- insert property
  insert into properties (name, address, city, state, total_units, type)
    values (
      'VD Daytona 1 , LLC',
      '1516 State Ave',
      'Holly Hill',
      'FL',
      39,
      'commercial'
    )
    on conflict do nothing;

  select id into v_property_id
    from properties
    where name = 'VD Daytona 1 , LLC';

  -- insert units
  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1516-1516-A',
      '1516 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1516-1516-BC',
      '1516 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1516-1516-D',
      '1516 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1516-1516-E',
      '1516 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1516-1516-F',
      '1516 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1516-1516-G',
      '1516 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1516-1516-H',
      '1516 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1516-1516-I',
      '1516 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1518-1518-A',
      '1518 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1518-1518-B',
      '1518 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1518-1518-C',
      '1518 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1518-1518-D',
      '1518 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1518-1518-F',
      '1518 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1518-1518-G',
      '1518 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1518-1518-H',
      '1518 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1518-1518-I',
      '1518 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1518-E',
      '1518 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1520-1520-ABC',
      '1520 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1520-1520-D',
      '1520 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1520-1520-E',
      '1520 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1520-1520-F',
      '1520 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1520-1520-G',
      '1520 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1520-1520-H',
      '1520 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1520-1520-I',
      '1520 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1524-1524ABC',
      '1524 State',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1526-1526-A',
      '1526 State',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1526-1526-B',
      '1526 State',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1526-1526-C',
      '1526 State',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1526-1526-DE',
      '1526 State',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1526-1526-FGH',
      '1526 State',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1530-1530-A-G',
      '1530 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1532-1532-A',
      '1532 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1532-1532-B',
      '1532 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1532-1532-C',
      '1532 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1532-1532-D',
      '1532 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1532-1532-EFG',
      '1532 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1532-1532-HIJ',
      '1532 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1532-1532-K',
      '1532 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1532-1532-L',
      '1532 State Ave',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

end;
$$;

-- ============================================================
-- DAYTONA 2 (VD Daytona 2, LLC)
-- ============================================================

do $$
declare
  v_property_id uuid;
begin

  -- insert property
  insert into properties (name, address, city, state, total_units, type)
    values (
      'VD Daytona 2, LLC',
      '1111 Enterprise Court',
      'Holly Hill',
      'FL',
      29,
      'commercial'
    )
    on conflict do nothing;

  select id into v_property_id
    from properties
    where name = 'VD Daytona 2, LLC';

  -- insert units
  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1111 ABMN',
      '1111 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1111 CODPEQ',
      '1111 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1111 FR',
      '1111 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1111 GS',
      '1111 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1111 HT',
      '1111 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1111 IJ',
      '1111 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1111 L',
      '1111 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1111K',
      '1111 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1115 AB',
      '1115 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1115 C',
      '1115 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1115 D',
      '1115 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1115 E',
      '1115 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1115 FG',
      '1115 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1115 HI',
      '1115 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1115 JK   1116 A-G, L-M',
      '1115 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      '1115 JK   1116 A'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1115 LM',
      '1115 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1115 N',
      '1115 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1116 H',
      '1116 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1116 I',
      '1116 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1116 J',
      '1116 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1116 K',
      '1116 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1120 A',
      '1120 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1120 BC',
      '1120 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1120 DK',
      '1120 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1120 EJ',
      '1120 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1120 FG',
      '1120 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1120 HI',
      '1120 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '1120 LM',
      '1120 Enterprise Court',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '456 A',
      '456 LPGA Blvd',
      'Holly Hill',
      'FL',
      '32117',
      null
    )
    on conflict (property_id, unit_number) do nothing;

end;
$$;

-- ============================================================
-- DAYTONA 3 (VD Daytona 3, LLC)
-- ============================================================

do $$
declare
  v_property_id uuid;
begin

  -- insert property
  insert into properties (name, address, city, state, total_units, type)
    values (
      'VD Daytona 3, LLC',
      '600 Oak Place',
      'Port Orange',
      'FL',
      21,
      'commercial'
    )
    on conflict do nothing;

  select id into v_property_id
    from properties
    where name = 'VD Daytona 3, LLC';

  -- insert units
  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '600 ABC2',
      '600 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '600 C',
      '600 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '600 D',
      '600 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '600 E',
      '600 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '600 F',
      '600 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '610 A',
      '610 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '610 BG',
      '610 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '620 AB',
      '620 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '620 C',
      '620 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '620 EF&J',
      '620 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '620 G',
      '620 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '620 KL',
      '620 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '620D',
      '620 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '620HI',
      '620 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '630 A',
      '630 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '630 BCPQ',
      '630 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '630 DE',
      '630 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '630 FM',
      '630 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '630 G-L',
      '630 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      '630 G'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '630 R',
      '630 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '640 A&B',
      '640 Oak Place',
      'Port Orange',
      'FL',
      '32127',
      null
    )
    on conflict (property_id, unit_number) do nothing;

end;
$$;

-- ============================================================
-- EAST PARK (VP DC East Park LLC)
-- ============================================================

do $$
declare
  v_property_id uuid;
begin

  -- insert property
  insert into properties (name, address, city, state, total_units, type)
    values (
      'VP DC East Park LLC',
      '11437 Central Parkway',
      'Jacksonville',
      'FL',
      43,
      'commercial'
    )
    on conflict do nothing;

  select id into v_property_id
    from properties
    where name = 'VP DC East Park LLC';

  -- insert units
  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11437-101',
      '11437 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11437-102',
      '11437 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11437-103',
      '11437 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11437-104',
      '11437 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11437-105',
      '11437 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11437-106',
      '11437 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11437-107',
      '11437 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11655 301-304+308-310',
      '11655 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11655 305',
      '11655 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11655 306-307',
      '11655 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11655 311',
      '11655 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11655 312',
      '11655 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11655 313',
      '11655 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11655 314-315',
      '11655 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11655 316',
      '11655 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11657 401-402',
      '11657 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11657 403-404',
      '11657 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11657 405-414',
      '11657 Central Parkway',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11760 1-2',
      '11760 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11760 3-5',
      '11760 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11760 6-10',
      '11760 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11762 1',
      '11762 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11762 10',
      '11762 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11762 2',
      '11762 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11762 3-4',
      '11762 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11762 5-6',
      '11762 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11762 7-8',
      '11762 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11762 9',
      '11762 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11762-1',
      '11762 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11764 1',
      '11764 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11764 3',
      '11764 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11764 4-6',
      '11764 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11764 7-10, 7A + 8A',
      '11764 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11764 9A',
      '11764 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '11764-2',
      '11764 Marco Beach Drive',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '3611 1 -4',
      '3611 St Johns Bluff Road South',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '3611 101 retail',
      '3611 St Johns Bluff Road South',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '3611 102 retail',
      '3611 St Johns Bluff Road South',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '3611 103 retail',
      '3611 St Johns Bluff Road South',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '3611 104 retail',
      '3611 St Johns Bluff Road South',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '3611 12-14',
      '3611 St Johns Bluff Road South',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '3611 5-8',
      '3611 St Johns Bluff Road South',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '3611 9-11',
      '3611 St Johns Bluff Road South',
      'Jacksonville',
      'FL',
      '32224',
      null
    )
    on conflict (property_id, unit_number) do nothing;

end;
$$;

-- ============================================================
-- SOUTH JAX (Decker Center South Jax, LLC)
-- ============================================================

do $$
declare
  v_property_id uuid;
begin

  -- insert property
  insert into properties (name, address, city, state, total_units, type)
    values (
      'Decker Center South Jax, LLC',
      '1025 Blanding Blvd',
      'Orange Park',
      'FL',
      32,
      'commercial'
    )
    on conflict do nothing;

  select id into v_property_id
    from properties
    where name = 'Decker Center South Jax, LLC';

  -- insert units
  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '502-504',
      '1025 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '604',
      '1027 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '605',
      '1027 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '602-603',
      '1027 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '606',
      '1027 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '601',
      '1027 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '704',
      '1029 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '702',
      '1029 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '703',
      '1029 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '705',
      '1029 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '706',
      '1029 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '701',
      '1029 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '404+A12:S12',
      '1031 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '402',
      '1031 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '401',
      '1031 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '406',
      '1031 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '405',
      '1031 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '501',
      '1031 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '403',
      '1031 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '302',
      '1033 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '301',
      '1033 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '304-305',
      '1033 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '108-109',
      '1035 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '103',
      '1035 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '101-102',
      '1035 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '104-105',
      '1035 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '106-107',
      '1035 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '203-207, 110, 303',
      '1045 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '201',
      '1045 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '209-210',
      '1045 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '208',
      '1045 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '202',
      '1045 Blanding Blvd',
      'Orange Park',
      'FL',
      '32065',
      null
    )
    on conflict (property_id, unit_number) do nothing;

end;
$$;

-- ============================================================
-- RIVERDALE (DC Riverdale, LLC)
-- ============================================================

do $$
declare
  v_property_id uuid;
begin

  -- insert property
  insert into properties (name, address, city, state, total_units, type)
    values (
      'DC Riverdale, LLC',
      '6275 GA Highway 85',
      'Riverdale',
      'GA',
      10,
      'commercial'
    )
    on conflict do nothing;

  select id into v_property_id
    from properties
    where name = 'DC Riverdale, LLC';

  -- insert units
  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '6275 GA-85 Unit A-1',
      '6275 GA Highway 85',
      'Riverdale',
      'GA',
      '30274',
      'A'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '6275 GA-85 Unit A-2',
      '6275 GA Highway 85',
      'Riverdale',
      'GA',
      '30274',
      'A'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '6275 GA-85 Unit A-3',
      '6275 GA Highway 85',
      'Riverdale',
      'GA',
      '30274',
      'A'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '6275 GA-85 Unit B-1',
      '6275 GA Highway 85',
      'Riverdale',
      'GA',
      '30274',
      'B'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '6275 GA-85 Unit B-2',
      '6275 GA Highway 85',
      'Riverdale',
      'GA',
      '30274',
      'B'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '6275 GA-85 Unit C-1',
      '6275 GA Highway 85',
      'Riverdale',
      'GA',
      '30274',
      'C'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '6275 GA-85 Unit C-2',
      '6275 GA Highway 85',
      'Riverdale',
      'GA',
      '30274',
      'C'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '6275 GA-85 Unit D-1',
      '6275 GA Highway 85',
      'Riverdale',
      'GA',
      '30274',
      'D'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '6275 GA-85 Unit D-2',
      '6275 GA Highway 85',
      'Riverdale',
      'GA',
      '30274',
      'D'
    )
    on conflict (property_id, unit_number) do nothing;

  insert into units (property_id, unit_number, street_address, city, state, zip, building)
    values (
      v_property_id,
      '6275 GA-85 Unit E',
      '6275 GA Highway 85',
      'Riverdale',
      'GA',
      '30274',
      'E'
    )
    on conflict (property_id, unit_number) do nothing;

end;
$$;
