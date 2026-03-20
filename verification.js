document.addEventListener('DOMContentLoaded', () => {
    // 1. Récupérer l'email passé dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const userEmail = urlParams.get('email');

    // Si pas d'email dans l'URL, on renvoie vers l'inscription par sécurité
    if (!userEmail) {
        window.location.href = "registre.html";
        return;
    }

    // Afficher l'email sur la page
    document.getElementById('display-email').textContent = userEmail;

    const verificationForm = document.getElementById('verificationForm');
    const verifyBtn = document.getElementById('verify-btn');

    // 2. Gérer la soumission du formulaire
    verificationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const otpCode = document.getElementById('otpCode').value.trim();

        if (otpCode.length !== 8) {
            alert("Le code doit contenir exactement 6 caractères.");
            return;
        }

        // Animation du bouton
        const originalText = verifyBtn.innerHTML;
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Vérification...';
        verifyBtn.disabled = true;

        try {
            // 3. Appel à Supabase pour vérifier le code (OTP)
            const { data, error } = await window.supabaseClient.auth.verifyOtp({
                email: userEmail,
                token: otpCode,
                type: 'signup' // Très important : on précise que c'est pour une inscription
            });

            if (error) throw error;

            // SUCCÈS !
            alert("✅ Compte confirmé avec succès ! Vous allez être redirigé vers la connexion.");
            window.location.href = "connexion.html"; // Redirection vers ta page de connexion

        } catch (error) {
            // ERREUR (Code invalide ou expiré)
            alert("❌ Erreur : Le code est invalide ou a expiré. Veuillez vérifier votre saisie.");
            console.error(error);
            
            // On remet le bouton à la normale
            verifyBtn.innerHTML = originalText;
            verifyBtn.disabled = false;
        }
    });
});