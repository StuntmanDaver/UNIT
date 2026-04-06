import * as xlsx from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  const excelFilePath = process.argv[2] || path.resolve(__dirname, '../data/properties-seed.xlsx');
  const sqlFilePath = path.resolve(__dirname, '../supabase/migrations/003_seed_decker_properties.sql');
  
  if (!fs.existsSync(excelFilePath)) {
    console.error(`❌ Excel file not found at path: ${excelFilePath}`);
    process.exit(1);
  }

  console.log(`📖 Reading Excel file: ${excelFilePath}`);
  const workbook = xlsx.readFile(excelFilePath);
  
  let sqlContent = `-- UNIT Database Schema - Migration 003\n`;
  sqlContent += `-- Seed Decker Capital properties and units (Generated from Excel)\n`;
  sqlContent += `-- Idempotent: uses ON CONFLICT DO NOTHING\n\n`;

  let totalPropertiesAdded = 0;
  let totalUnitsAdded = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (data.length === 0) continue;

    const firstRowKeys = Object.keys(data[0]);
    const propertyNameRaw = firstRowKeys[0];
    let propertyName = propertyNameRaw.trim();
    
    if (propertyName.toLowerCase() === 'unit' || propertyName === '') continue;

    let sampleAddressStr = '';
    for (const row of data as any[]) {
       const addr = row['__EMPTY'] || row['Address'] || row[firstRowKeys[1]];
       if (addr && addr.toLowerCase() !== 'address') {
         sampleAddressStr = addr;
         break;
       }
    }

    let streetAddress = '';
    let city = '';
    let state = 'FL';
    let zip = '';

    if (sampleAddressStr) {
      const parts = sampleAddressStr.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        streetAddress = parts[0];
        city = parts[1];
        const stateZip = parts[2].split(' ');
        state = stateZip[0];
        zip = stateZip[stateZip.length - 1];
      } else {
        streetAddress = sampleAddressStr;
      }
    }
    
    // Count units for this property
    let unitCount = 0;
    const unitsToInsert = [];

    for (const row of data as any[]) {
      const unitVal = row[propertyNameRaw];
      const addressVal = row['__EMPTY'] || row['Address'] || row[firstRowKeys[1]];
      
      if (!unitVal || unitVal.toString().toLowerCase() === 'unit') continue;
      
      const unitNumber = unitVal.toString().trim();
      let rowStreetAddress = streetAddress;
      let rowCity = city;
      let rowState = state;
      let rowZip = zip;

      if (addressVal && addressVal.toLowerCase() !== 'address') {
         const parts = addressVal.split(',').map((p: string) => p.trim());
         if (parts.length >= 3) {
           rowStreetAddress = parts[0];
           rowCity = parts[1];
           const stateZip = parts[2].split(' ');
           rowState = stateZip[0];
           rowZip = stateZip[stateZip.length - 1];
         }
      }

      // Try to parse building from unit number if it's in format "B1-652" or "A-1"
      let building = 'null';
      const buildingMatch = unitNumber.match(/^([A-Z0-9]+)-/i);
      if (buildingMatch && buildingMatch[1] && buildingMatch[1].length <= 3) {
         building = `'${buildingMatch[1].replace(/'/g, "''")}'`;
      } else if (unitNumber.includes('Unit')) {
         const bMatch = unitNumber.match(/Unit\s+([A-Z0-9]+)-/i);
         if (bMatch && bMatch[1]) {
           building = `'${bMatch[1].replace(/'/g, "''")}'`;
         }
      }

      unitsToInsert.push({
         unit_number: unitNumber.replace(/'/g, "''"),
         street_address: rowStreetAddress.replace(/'/g, "''"),
         city: rowCity.replace(/'/g, "''"),
         state: rowState.replace(/'/g, "''"),
         zip: rowZip.replace(/'/g, "''"),
         building: building
      });
      unitCount++;
    }

    if (unitCount === 0) continue;

    totalPropertiesAdded++;
    totalUnitsAdded += unitCount;

    // Append to SQL
    sqlContent += `-- ============================================================\n`;
    sqlContent += `-- ${propertyName.toUpperCase()}\n`;
    sqlContent += `-- ============================================================\n\n`;
    sqlContent += `do $$\ndeclare\n  v_property_id uuid;\nbegin\n\n`;
    
    // Insert Property safely (idempotent without unique constraint)
    sqlContent += `  -- insert property\n`;
    sqlContent += `  insert into properties (name, address, city, state, total_units, type)\n`;
    sqlContent += `    select '${propertyName.replace(/'/g, "''")}',\n`;
    sqlContent += `           '${streetAddress.replace(/'/g, "''")}',\n`;
    sqlContent += `           '${city.replace(/'/g, "''")}',\n`;
    sqlContent += `           '${state.replace(/'/g, "''")}',\n`;
    sqlContent += `           ${unitCount},\n`;
    sqlContent += `           'commercial'\n`;
    sqlContent += `    where not exists (\n`;
    sqlContent += `      select 1 from properties where name = '${propertyName.replace(/'/g, "''")}'\n`;
    sqlContent += `    );\n\n`;

    sqlContent += `  select id into v_property_id\n`;
    sqlContent += `    from properties\n`;
    sqlContent += `    where name = '${propertyName.replace(/'/g, "''")}'\n`;
    sqlContent += `    limit 1;\n\n`;

    sqlContent += `  -- insert units\n`;

    for (const u of unitsToInsert) {
      sqlContent += `  insert into units (property_id, unit_number, street_address, city, state, zip, building)\n`;
      sqlContent += `    values (\n`;
      sqlContent += `      v_property_id,\n`;
      sqlContent += `      '${u.unit_number}',\n`;
      sqlContent += `      '${u.street_address}',\n`;
      sqlContent += `      '${u.city}',\n`;
      sqlContent += `      '${u.state}',\n`;
      sqlContent += `      '${u.zip}',\n`;
      sqlContent += `      ${u.building}\n`;
      sqlContent += `    )\n`;
      sqlContent += `    on conflict (property_id, unit_number) do nothing;\n\n`;
    }

    sqlContent += `end;\n$$;\n\n`;
  }

  // Write to SQL file
  fs.writeFileSync(sqlFilePath, sqlContent);

  console.log('\n=============================================');
  console.log(`🎉 SQL Migration Generated!`);
  console.log(`📝 File: ${sqlFilePath}`);
  console.log(`🏢 Properties: ${totalPropertiesAdded}`);
  console.log(`🚪 Units: ${totalUnitsAdded}`);
  console.log('=============================================');
}

main().catch(console.error);