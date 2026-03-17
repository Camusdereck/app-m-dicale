// connexion.js - VERSION FINALE (Sécurisée avec redirection correcte)

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
            if (type === 'text') {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    }

    // Gérer la soumission du formulaire de connexion
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Vérification...';
            submitBtn.disabled = true;

            try {
                // 1. Authentification
                const { data: authData, error: authError } = await window.supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (authError) throw authError;

                const userId = authData.user.id;

                // 2. Vérification Patient
                const { data: patientData, error: patientError } = await window.supabaseClient
                    .from('patients')
                    .select('id')
                    .eq('id', userId)
                    .maybeSingle();

                if (patientData) {
                    // C'est un patient ! Redirection vers dashboard.html
                    window.location.href = 'dashboard.html';
                    return; 
                }

                // 3. Vérification Médecin
                const { data: medecinData, error: medecinError } = await window.supabaseClient
                    .from('medecins')
                    .select('id')
                    .eq('id', userId)
                    .maybeSingle();

                if (medecinData) {
                    // C'est un médecin ! Redirection vers dashboard-medecin.html
                    window.location.href = 'dashboard-medecin.html';
                    return;
                }

                throw new Error("Votre profil est introuvable. Veuillez contacter le support.");

            } catch (err) {
                let messageErreur = "Une erreur est survenue.";
                
                if (err.message === "Invalid login credentials") {
                    messageErreur = "L'email ou le mot de passe est incorrect.";
                } else {
                    messageErreur = err.message;
                }

                alert("Erreur : " + messageErreur);
                console.error(err);
                
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
});