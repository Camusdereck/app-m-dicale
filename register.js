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
            handleSignUp(data, 'patients', e.submitter);
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
                
                // LA NOUVELLE INFO EST ICI 👇
                commune: document.getElementById('doctorCommune').value, 
                
                specialite: document.getElementById('specialite').value, 
                order_number: document.getElementById('orderNumber').value, 
                password: document.getElementById('doctorPassword').value
            };
            handleSignUp(data, 'medecins', e.submitter);
        });
    }
});

// --- LE TRADUCTEUR D'ERREURS EN FRANÇAIS ---
function translateError(msgEnAnglais) {
    const errorMap = {
        "Invalid login credentials": "L'email ou le mot de passe est incorrect.",
        "User already registered": "Cet email est déjà utilisé par un autre compte.",
        "Email rate limit exceeded": "Sécurité anti-spam : Trop d'essais. Veuillez réessayer dans une heure.",
        "Password should be at least 6 characters": "Le mot de passe doit contenir au moins 6 caractères.",
        "To security purposes, you can only request this after": "Veuillez patienter avant de faire une nouvelle demande."
    };
    return errorMap[msgEnAnglais] || msgEnAnglais; 
}

// --- FONCTION PRINCIPALE D'INSCRIPTION ---
async function handleSignUp(userData, table, submitBtn) {
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Création...';
    submitBtn.disabled = true;

    try {
        // 1. On crée le compte AUTH d'abord
        const { data: authData, error: authError } = await window.supabaseClient.auth.signUp({
            email: userData.email,
            password: userData.password,
        });

        // Si erreur Supabase (ex: email déjà pris), on s'arrête ici proprement
        if (authError) throw authError;

        const profileData = { ...userData, id: authData.user.id };
        delete profileData.password; 

        // 2. On insère dans la base de données (patients ou medecins)
        const { error: dbError } = await window.supabaseClient
            .from(table)
            .insert([profileData]);

        if (dbError) throw dbError;

        // 3. Succès !
        alert("✅ Inscription réussie ! Un code de confirmation a été envoyé à " + userData.email + ".");
        window.location.href = "verification.html?email=" + encodeURIComponent(userData.email);

    } catch (err) {
        // On affiche l'erreur en français grâce à notre traducteur
        alert("Attention : " + translateError(err.message));
        console.error(err);
        
        // On remet le bouton à la normale
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Afficher/Masquer le mot de passe
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('i'); 

    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = "password";
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};