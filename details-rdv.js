// details-rdv.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Lire l'ID du rendez-vous depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const rdvId = urlParams.get('id');

    // Si on n'a pas trouvé d'ID, on ne fait rien.
    if (!rdvId) {
        document.body.innerHTML = "<h1>Erreur : ID du rendez-vous manquant.</h1>";
        return;
    }

    // 2. Appeler la fonction pour chercher les détails
    fetchAppointmentDetails(rdvId);
});


/**
 * Récupère et affiche les détails d'un rendez-vous spécifique.
 * @param {string} rdvId - L'ID du rendez-vous à chercher.
 */
async function fetchAppointmentDetails(rdvId) {
    // On va chercher la consultation, ET les informations liées du médecin et du type de consultation
    const { data, error } = await supabaseClient
        .from('consultations')
        .select(`
            motif,
            statut,
            medecins ( full_name ),
            types_consultation ( nom, prix )
        `)
        .eq('id', rdvId)
        .single(); // .single() car on ne veut qu'un seul résultat

    if (error) {
        console.error("Erreur lors de la récupération des détails :", error);
        document.body.innerHTML = "<h1>Erreur : Impossible de charger les détails du rendez-vous.</h1>";
        return;
    }

    // 3. Afficher les informations dans le HTML
    if (data) {
        document.getElementById('rdv-motif').textContent = data.motif || 'Non spécifié';
        document.getElementById('rdv-status').textContent = data.statut || 'N/A';
        
        // On vérifie que les données liées existent avant de les afficher
        document.getElementById('rdv-medecin').textContent = data.medecins ? data.medecins.full_name : 'N/A';
        document.getElementById('rdv-type').textContent = data.types_consultation ? data.types_consultation.nom : 'N/A';
        document.getElementById('rdv-prix').textContent = data.types_consultation ? `${data.types_consultation.prix} FCFA` : 'N/A';
        
        // Pour la date, il faudrait la stocker dans la base. Pour l'instant on laisse vide.
        document.getElementById('rdv-date').textContent = 'Date non disponible';
    }
}