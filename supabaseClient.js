// supabaseClient.js - VERSION FINALE ET SIMPLIFIÉE

const supabaseUrl = 'https://gpbuwjzmjgxrbnbsvwou.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwYnV3anptamd4cmJuYnN2d291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NzE3MzksImV4cCI6MjA3MzM0NzczOX0.ILZdcGClsNMyXI9_fILZ2vpSAPaQxjQyMjyMGZkJSy0';

// Crée le client et le rend disponible globalement en UNE SEULE ligne
window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);