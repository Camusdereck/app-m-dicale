document.addEventListener('DOMContentLoaded', () => {
    const patientForm = document.getElementById('patientForm');
    const doctorForm = document.getElementById('doctorForm');

    // INSCRIPTION PATIENT
    if (patientForm) {
        patientForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                first_name: document.getElementById('patientFirstName').value,
                last_name: document.getElementById('patientLastName').value,
                email: document.getElementById('patientEmail').value,
                phone: document.getElementById('patientPhone').value,
                password: document.getElementById('patientPassword').value
            };
            handleSignUp(data, 'patients', e.submitter); // e.submitter = le bouton cliqué
        });
    }

    // INSCRIPTION MÉDECIN
    if (doctorForm) {
        doctorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                first_name: document.getElementById('doctorFirstName').value,
                last_name: document.getElementById('doctorLastName').value,
                email: document.getElementById('doctorEmail').value,
                phone: document.getElementById('doctorPhone').value,
                
                // LA CORRECTION EST ICI : on utilise la clé "specialite" pour matcher avec Supabase
                // Et on pointe vers l'ID HTML "specialite" qu'on a corrigé tout à l'heure
                specialite: document.getElementById('specialite').value, 
                
                order_number: document.getElementById('orderNumber').value, 
                password: document.getElementById('doctorPassword').value
            };
            handleSignUp(data, 'medecins', e.submitter);
        });
    }
});

async function handleSignUp(userData, table, submitBtn) {
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Création en cours...';
    submitBtn.disabled = true;

    try {
        // 1. Création dans Auth (Supabase envoie l'e-mail de confirmation automatiquement ici)
        const { data: authData, error: authError } = await window.supabaseClient.auth.signUp({
            email: userData.email,
            password: userData.password,
        });

        if (authError) throw authError;

        // 2. Préparation des données pour la base de données
        const profileData = { ...userData, id: authData.user.id };
        delete profileData.password; 

        // 3. Insertion dans la table publique (patients ou medecins)
        const { error: dbError } = await window.supabaseClient
            .from(table)
            .insert([profileData]);

        if (dbError) throw dbError;

        // NOUVEAU MESSAGE DE SUCCÈS
        alert("✅ Inscription réussie ! Un code de confirmation a été envoyé à " + userData.email + ". Veuillez vérifier vos e-mails (et vos spams).");
        
        window.location.href = "verification.html?email=" + encodeURIComponent(userData.email);

    } catch (err) {
        alert("Erreur lors de l'inscription : " + err.message);
        console.error(err);
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}


// Fonction pour afficher/masquer le mot de passe
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    // On cible l'icône <i> à l'intérieur du bouton qui suit l'input
    const icon = input.nextElementSibling.querySelector('i'); 

    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash'); // Change l'icône en œil barré
    } else {
        input.type = "password";
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye'); // Remet l'œil normal
    }
};