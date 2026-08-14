import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xetopzlqualgavlfflls.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhldG9wemxxdWFsZ2F2bGZmbGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MDIyNzIsImV4cCI6MjEwMjI3ODI3Mn0.qtLQuK4eGUXHRSrXMPMGIky6Km_BnLWu3FNwOxTwPIQ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
