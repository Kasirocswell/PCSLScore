const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://etrgtzzidzimqxodrcpp.supabase.co';
// Using Service Role key to bypass RLS
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0cmd0enppZHppbXF4b2RyY3BwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjE1NzcxMiwiZXhwIjoyMDk3NzMzNzEyfQ.YvMIjIkqHTHTU9gLF8X_28JjajkDPvZ8b4aZLAUJMoQ';

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Fetching all matches with Service Role (Bypassing RLS)...");
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id, name, is_published, date');

  if (matchesError) {
    console.error("Error fetching matches:", matchesError);
    return;
  }

  console.log(`Found ${matches.length} matches:`);
  for (const match of matches) {
    // Fetch registrations using Service Role
    const { data: regs, error: regsError } = await supabase
      .from('registrations')
      .select(`
        id,
        division,
        payment_status,
        profile_id,
        profiles (
          id,
          full_name,
          email
        )
      `)
      .eq('match_id', match.id);

    if (regsError) {
      console.error(`Error fetching registrations for match ${match.id}:`, regsError);
    } else {
      if (regs.length > 0) {
        console.log(`Match ID: ${match.id}, Name: ${match.name}`);
        console.log(`  Registrations count (Service Role): ${regs.length}`);
        regs.forEach(r => {
          console.log(`    Reg ID: ${r.id}, Div: ${r.division}, Status: ${r.payment_status}, ProfileID: ${r.profile_id}, Profile: ${JSON.stringify(r.profiles)}`);
        });
      }
    }
  }
}

run();
