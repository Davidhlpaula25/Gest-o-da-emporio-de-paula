import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Substitua pelo SEU URL (copie do painel)
const supabaseUrl = 'https://rzykakdivdyauwvwaumy.supabase.co'
// Substitua pela SUA chave 'anon public' (copie do painel)
const supabaseKey ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6eWtha2RpdmR5YXV3dndhdW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NjY4MDUsImV4cCI6MjA4MTU0MjgwNX0.LgifJqcAVn_bsGNo-RM_3Z_mkzHavJTahXg83BcEuBA'

export const supabase = createClient(supabaseUrl, supabaseKey)