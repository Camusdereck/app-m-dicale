document.addEventListener('DOMContentLoaded', async () => {
    // 1. Vérifier si l'utilisateur est connecté
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    
    if (authError || !user) {
        window.location.href = './connexion.html';
        return;
    }

    // 2. Logique pour obliger la lecture du document
    const legalDoc = document.getElementById('legal-text');
    const checkbox = document.getElementById('accept-checkbox');
    const signatureInput = document.getElementById('signature-name');
    const submitBtn = document.getElementById('btn-submit');
    const warningText = document.getElementById('scroll-warning');

    legalDoc.addEventListener('scroll', () => {
        // Vérifie si on est arrivé tout en bas de la boîte de texte
        if (legalDoc.scrollHeight - legalDoc.scrollTop <= legalDoc.clientHeight + 5) {
            checkbox.disabled = false;
            warningText.style.display = 'none';
            legalDoc.classList.add('border-success');
        }
    });

    // 3. Activer le champ de signature et le bouton uniquement si la case est cochée
    checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            signatureInput.disabled = false;
            signatureInput.focus();
            submitBtn.disabled = false;
        } else {
            signatureInput.disabled = true;
            signatureInput.value = '';
            submitBtn.disabled = true;
        }
    });

    // 4. Soumettre le formulaire et enregistrer dans Supabase
    document.getElementById('engagement-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Signature en cours...';
        submitBtn.disabled = true;

        const signature = signatureInput.value.trim();

        // On met à jour la colonne 'engagement_signe' du patient
        const { error } = await window.supabaseClient
            .from('patients')
            .update({ 
                engagement_signe: true,
                // On pourrait aussi ajouter une colonne date_signature si le client le souhaite
            })
            .eq('id', user.id);

        if (error) {
            alert("Une erreur est survenue lors de la signature.");
            submitBtn.innerHTML = 'Réessayer';
            submitBtn.disabled = false;
        } else {
            // C'est validé, on l'envoie enfin sur son tableau de bord !
            window.location.href = './dashboard.html';
        }
    });
});