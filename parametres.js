// parametres.js - Gestion de la sécurité du compte

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Vérifier si l'utilisateur est bien connecté
    const { data: { user }, error } = await window.supabaseClient.auth.getUser();
    
    if (error || !user) {
        window.location.href = 'connexion.html';
        return;
    }

    // 2. Gestion du formulaire de changement de mot de passe
    const formPwd = document.getElementById('form-change-password');
    const msgDiv = document.getElementById('password-msg');
    const btnSubmit = document.getElementById('btn-update-pwd');

    if (formPwd) {
        formPwd.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newPwd = document.getElementById('new-password').value;
            const confirmPwd = document.getElementById('confirm-password').value;

            // Réinitialiser les messages
            msgDiv.className = 'mb-3 small fw-bold';
            msgDiv.textContent = '';

            if (newPwd !== confirmPwd) {
                msgDiv.classList.add('text-danger');
                msgDiv.textContent = '❌ Les mots de passe ne correspondent pas.';
                return;
            }

            // Changer l'état du bouton
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Mise à jour...';

            try {
                // Fonction Supabase pour mettre à jour l'utilisateur
                const { error: updateError } = await window.supabaseClient.auth.updateUser({
                    password: newPwd
                });

                if (updateError) throw updateError;

                msgDiv.classList.add('text-success');
                msgDiv.textContent = '✅ Votre mot de passe a été mis à jour avec succès !';
                formPwd.reset();

            } catch (err) {
                msgDiv.classList.add('text-danger');
                msgDiv.textContent = '❌ Erreur : ' + err.message;
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = 'Mettre à jour le mot de passe';
            }
        });
    }
});