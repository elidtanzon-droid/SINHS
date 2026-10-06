// Put your Supabase project information here.

// IMPORTANT:
// Never put your Supabase service_role or secret key here.

const SUPABASE_URL =
  "https://rhkqyorwbopfletqsyte.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_VGMALfUU4OilwR7r63tQdw_PshES3OE";


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
