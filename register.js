// register.js - NOUVELLE VERSION ADAPTÉE À TON HTML

// On attend que toute la page soit chargée
document.addEventListener('DOMContentLoaded', () => {

    const patientForm = document.getElementById('patientForm');
    const doctorForm = document.getElementById('doctorForm');

    // --- GESTION DU FORMULAIRE PATIENT ---
    patientForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Empêche le rechargement de la page

        // Récupère les valeurs du formulaire patient
        const firstName = document.getElementById('patientFirstName').value;
        const lastName = document.getElementById('patientLastName').value;
        const email = document.getElementById('patientEmail').value;
        const password = document.getElementById('patientPassword').value;
        const fullName = `${firstName} ${lastName}`; // On combine le nom et le prénom

        // On appelle la fonction d'inscription
        handleSignUp(email, password, fullName, false); // false car ce n'est pas un médecin
    });

    // --- GESTION DU FORMULAIRE MÉDECIN ---
    doctorForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Empêche le rechargement de la page

        // Récupère les valeurs du formulaire médecin
        const firstName = document.getElementById('doctorFirstName').value;
        const lastName = document.getElementById('doctorLastName').value;
        const email = document.getElementById('doctorEmail').value;
        const password = document.getElementById('doctorPassword').value;
        const fullName = `${firstName} ${lastName}`;

        // On appelle la fonction d'inscription
        handleSignUp(email, password, fullName, true); // true car c'est un médecin
    });

});


/**
 * Fonction générale pour gérer l'inscription
 * @param {string} email 
 * @param {string} password 
 * @param {string} fullName 
 * @param {boolean} isDoctor 
 */
async function handleSignUp(email, password, fullName, isDoctor) {
    try {
        // 1. Création de l'utilisateur dans Supabase Auth
        // On utilise 'supabaseClient' qui vient de notre fichier de configuration
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        if (authError) {
            throw authError; // Lance une erreur pour être attrapée par le bloc catch
        }

        // 2. Création du profil dans la bonne table (patients ou medecins)
        const user = authData.user;
        const tableName = isDoctor ? 'medecins' : 'patients';

        const { error: profileError } = await supabaseClient
            .from(tableName)
            .insert([{
                id: user.id,
                full_name: fullName
                // Tu pourras ajouter d'autres champs ici plus tard (téléphone, etc.)
            }]);

        if (profileError) {
            throw profileError; // Lance une erreur
        }

        alert("Inscription réussie ! Un email de confirmation a été envoyé.");
        // Optionnel : rediriger vers la page de connexion après un court délai
        // setTimeout(() => { window.location.href = "/connexion.html"; }, 2000);

    } catch (error) {
        console.error("Erreur détaillée :", error);
        alert("Une erreur est survenue : " + error.message);
    }
}