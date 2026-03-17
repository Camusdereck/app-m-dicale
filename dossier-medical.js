// dossier-medical.js

document.addEventListener('DOMContentLoaded', async () => {
    // On récupère l'utilisateur connecté pour avoir son ID
    const { data: { user } } = await supabaseClient.auth.getUser();

    // Si personne n'est connecté, on redirige vers la page de connexion
    if (!user) {
        window.location.href = "./connexion.html";
        return;
    }

    // --- 1. FONCTION POUR CHARGER LES DONNÉES ---
    async function loadMedicalData() {
        // On va chercher la ligne dans la table 'patients' qui correspond à l'utilisateur
        const { data, error } = await supabaseClient
            .from('patients')
            .select('poids, taille, tension, antecedents_medicaux')
            .eq('id', user.id)
            .single(); // .single() pour ne récupérer qu'une seule ligne

        if (error && error.code !== 'PGRST116') { // On ignore l'erreur si c'est juste "aucune ligne trouvée"
            console.error("Erreur lors du chargement du dossier :", error);
            return;
        }

        // Si des données existent, on remplit les champs du formulaire
        if (data) {
            document.getElementById('poids-input').value = data.poids || '';
            document.getElementById('taille-input').value = data.taille || '';
            document.getElementById('tension-input').value = data.tension || '';
            document.getElementById('antecedents-input').value = data.antecedents_medicaux || '';
        }
    }

    // On charge les données dès l'ouverture de la page
    loadMedicalData();


    // --- 2. GESTION DE LA SAUVEGARDE DU FORMULAIRE ---
    const medicalForm = document.getElementById('medicalRecordForm');
    medicalForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Empêche le rechargement

        // On crée un objet avec les nouvelles informations
        const updatedData = {
            poids: document.getElementById('poids-input').value,
            taille: document.getElementById('taille-input').value,
            tension: document.getElementById('tension-input').value,
            antecedents_medicaux: document.getElementById('antecedents-input').value
        };

        // On met à jour la ligne dans la table 'patients' qui correspond à notre utilisateur
        const { data, error } = await supabaseClient
            .from('patients')
            .update(updatedData)
            .eq('id', user.id);

        if (error) {
            console.error("Erreur lors de la sauvegarde :", error);
            alert("Une erreur est survenue lors de la sauvegarde.");
        } else {
            alert("Votre dossier médical a été mis à jour avec succès !");
        }
    });
});