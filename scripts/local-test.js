// Local test without network dependency
const { createClient } = require('@supabase/supabase-js');

// Mock data from your teams table
const mockTeams = [
  { id: '1', team_code: 'TH01', group_name: 'C', password: 'TH010000' },
  { id: '2', team_code: 'TH02', group_name: 'D', password: 'TH020000' }
];

// Mock qr_codes data
const mockQrCodes = [
  { question_code: 'TH01', secret_code: 'TH010000', group_name: 'C', scan_count: 0, id: 'q1' },
  { question_code: 'TH02', secret_code: 'TH020000', group_name: 'D', scan_count: 0, id: 'q2' }
];

async function testLogic() {
  console.log('=== Local Test ===');

  // Test 1: Team session contains group_name
  const session = { teamId: '1', teamCode: 'TH01', leaderName: 'Test' };
  console.log('Session has group_name?', session.teamCode);

  // Test 2: Find team group from teams table (mock)
  const team = mockTeams.find(t => t.team_code === session.teamCode);
  console.log('Found team:', team ? team.group_name : 'NOT FOUND');

  // Test 3: QR verification logic
  const qr = mockQrCodes.find(q => q.question_code === session.teamCode && q.group_name === team.group_name);
  console.log('QR match:', qr ? { ok: true, scan_count: qr.scan_count } : { ok: false });

  if (qr) {
    // Simulate increment
    const newCount = qr.scan_count + 1;
    console.log('✅ QR verified! New scan count:', newCount);
  }
}

testLogic();
