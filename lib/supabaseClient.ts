import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnzxcehzullpsihqbncs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuenhjZWh6dWxscHNpaHFibmNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTM2NTksImV4cCI6MjA2ODc4OTY1OX0.jBW4dZADTR0Lb_G4hWyHFKzdECntOu4RuV_QoouuHsg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
