const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rwtejuojcukcznlccsse.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dGVqdW9qY3VrY3pubGNjc3NlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgzODk2MiwiZXhwIjoyMDk4NDE0OTYyfQ.Yqa7HRexhBre95NDUi3VB8n1RKDK3_afXgHioy8THQc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const tables = ['diet_assignments', 'assigned_diets', 'member_diets', 'diet_plans', 'member_diet_plans'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`Table exists: ${table}`);
      console.log(`Columns:`, data ? Object.keys(data[0] || {}) : null);
    } else {
      console.log(`Table failed: ${table}`, error.message);
    }
  }
}

run();
