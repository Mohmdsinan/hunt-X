const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin(teamCode, password) {
  console.log('=== Test Login ===');
  console.log('Team code:', teamCode, 'Password:', password);

  // Find team
  const { data: team, error } = await supabase
    .from('teams')
    .select('id, team_code, group_name, password')
    .eq('team_code', teamCode)
    .single();

  console.log('Database team:', team ? { id: team.id, code: team.team_code, group: team.group_name, password: team.password ? '***' : null } : null);
  if (error) console.log('Error:', error);

  if (!team) {
    console.log('❌ Team not found');
    return;
  }

  // Test password
  if (team.password !== password) {
    console.log('❌ Password mismatch');
    return;
  }

  console.log('✅ Password correct');

  // Test QR verification
  const { data: qr, error: qrError } = await supabase.rpc('verify_qr_and_increment', {
    p_question: teamCode,
    p_secret: password,
    p_group: team.group_name,
  });

  console.log('QR verification:', qr);
  if (qr?.ok) {
    console.log('✅ QR works! Scan count:', qr.scan_count);
  } else {
    console.log('❌ QR failed:', qr?.message);
  }
}

// Test with real data
const testTeam = 'TH01';
const testPassword = 'TH010000';

testLogin(testTeam, testPassword).catch(console.error);
