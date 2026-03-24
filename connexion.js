// connexion.js - VERSION DÉFINITIVE (Production)

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    // Gérer l'affichage/masquage du mot de passe
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            const icon = togglePasswordBtn.querySelector('i');
            icon.className = type === 'text' ? 'fas fa-eye-slash' : 'fas fa-eye';
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const emailInput = document.getElementById('email').value.trim();
            const passwordInputStr = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;

            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Vérification...';
            submitBtn.disabled = true;

            try {
                // 1. Authentification globale (La porte principale)
                const { data: authData, error: authError } = await window.supabaseClient.auth.signInWithPassword({
                    email: emailInput,
                    password: passwordInputStr,
                });

                if (authError) throw authError;

                const userId = authData.user.id;
                const userEmail = authData.user.email; // On utilise l'email validé par Supabase

                // 2. Vérification Super Admin (Le guichet direction)
                const { data: adminData } = await window.supabaseClient
                    .from('admins')
                    .select('*')
                    .eq('email', userEmail)
                    .maybeSingle();

                if (adminData) {
                    window.location.href = 'admin-dashboard.html';
                    return; 
                }

                // 3. Vérification Médecin (Le guichet médical)
                const { data: medecinData } = await window.supabaseClient
                    .from('medecins')
                    .select('id')
                    .eq('id', userId)
                    .maybeSingle();

                if (medecinData) {
                    window.location.href = 'dashboard-medecin.html';
                    return;
                }

                // 4. Vérification Patient (Le guichet public)
                const { data: patientData } = await window.supabaseClient
                    .from('patients')
                    .select('id')
                    .eq('id', userId)
                    .maybeSingle();

                if (patientData) {
                    window.location.href = 'dashboard.html';
                    return; 
                }

                // 5. Si le compte existe mais n'a aucun rôle assigné
                throw new Error("Compte reconnu, mais aucun profil (Admin/Médecin/Patient) ne vous est assigné.");

            } catch (err) {
                let messageErreur = err.message;
                if (messageErreur.includes("Invalid login credentials")) {
                    messageErreur = "L'email ou le mot de passe est incorrect.";
                }
                alert("Erreur : " + messageErreur);
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
});