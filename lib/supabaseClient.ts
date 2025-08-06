import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zhnqryvckbmdqyzexzxo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobnFyeXZja2JtZHF5emV4enhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NTA4MDcsImV4cCI6MjA2ODAyNjgwN30.H9nAZSjauVRr84JJoWARJExVnjCUAM-fY1yEiL4vep4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
