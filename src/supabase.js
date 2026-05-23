import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://awavzlpefkoejptgxias.supabase.co/rest/v1/";
const supabaseKey = "sb_publishable_5cOwxEU0h7JfchVi_gIEmg_GbnOVlc0Y";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
