const fetch = require('node-fetch');

const supabaseUrl = 'https://rwtejuojcukcznlccsse.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dGVqdW9qY3VrY3pubGNjc3NlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgzODk2MiwiZXhwIjoyMDk4NDE0OTYyfQ.Yqa7HRexhBre95NDUi3VB8n1RKDK3_afXgHioy8THQc';

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    }
  });
  const data = await res.json();
  const rpcs = Object.keys(data.paths).filter(p => p.startsWith('/rpc/'));
  console.log("Exposed RPCs:", rpcs);
}

run();
