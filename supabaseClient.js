
// supabaseClient.js

const supabaseUrl = 'https://avirqhaakmxbpyfcmuzq.supabase.co'; // Colle ton URL ici
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aXJxaGFha254YnB5ZmNtdXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjkzNTksImV4cCI6MjA3Mjc0NTM1OX0.SGG01QG8flg6TZ1OtjVOtzwrwZbJkA6Tdu_G-6yOSlc'; // Colle ta clé API "anon public" ici

// Crée une variable 'supabase' que les autres scripts pourront utiliser
// On utilise l'objet 'supabase' qui vient du script CDN ajouté dans le HTML
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// supabaseClient.js - VERSION CORRIGÉE

const supabaseUrl = 'https://avirqhaakmxbpyfcmuzq.supabase.co'; // Colle ton URL ici
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aXJxaGFha254YnB5ZmNtdXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjkzNTksImV4cCI6MjA3Mjc0NTM1OX0.SGG01QG8flg6TZ1OtjVOtzwrwZbJkA6Tdu_G-6yOSlc'; // Colle ta clé API "anon public" ici

/**
 * Correction : On utilise un nom de variable différent ('supabaseClient')
 * pour ne pas entrer en conflit avec l'objet global 'supabase' qui vient du CDN.
 */
window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);