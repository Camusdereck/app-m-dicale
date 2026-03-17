// supabaseClient.js - CONFIGURATION CORRIGÉE

// 1. L'URL doit TOUJOURS commencer par https:// et finir par .supabase.co
const supabaseUrl = 'https://pwfwsxiysarvbtnapman.supabase.co';

// 2. Ici, tu peux utiliser soit la clé "anon" (JWT), soit la nouvelle "publishable key"
const supabaseKey = 'sb_publishable_foN5YmSKwVFClIhb_rSSUA_LcVBQ0n4';

// 3. Création du client global
window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);


// Fonction pour envoyer un SMS de confirmation
async function envoyerSMSNotification(numeroPatient, dateRdv, nomMedecin) {
    // 1. On prépare le texte du SMS
    const messageTexte = `MediConnect CI : Votre RDV avec le Dr. ${nomMedecin} le ${dateRdv} est confirmé. Préparez vos documents.`;

    // 2. La configuration de ton fournisseur SMS (À remplacer par tes futures clés)
    const apiUrl = "https://api.fournisseur-sms.com/v1/send"; // L'URL donnée par ton fournisseur
    const apiKey = "TA_CLE_API_SECRETE_ICI";

    try {
        // 3. On demande au fournisseur d'envoyer le SMS
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}` // Souvent requis pour la sécurité
            },
            body: JSON.stringify({
                sender_id: "MediConnect", // Le nom qui s'affichera sur le téléphone du patient
                recipient: numeroPatient,
                message: messageTexte
            })
        });

        if (response.ok) {
            console.log("✅ SMS envoyé avec succès au " + numeroPatient);
        } else {
            console.error("❌ Le fournisseur SMS a refusé l'envoi.");
        }
    } catch (error) {
        console.error("Erreur technique de connexion à l'API SMS :", error);
    }
}