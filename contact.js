// contact.js - Gestion du formulaire de contact vers Supabase

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const feedbackDiv = document.getElementById('contact-feedback');
    const btnSubmit = document.getElementById('btn-submit-contact');

    // Textes d'aide dynamiques en fonction du sujet choisi
    const subjectSelect = document.getElementById('subject');
    const messageTextarea = document.getElementById('message');
    
    const helpTexts = {
        'Support technique': 'Décrivez le problème technique que vous rencontrez...',
        'Facturation': 'Mentionnez votre numéro de transaction ou date de paiement...',
        'Rendez-vous': 'Précisez avec quel médecin et votre disponibilité...',
        'Partenariat': 'Présentez votre clinique ou entreprise...',
        'Autre': 'Décrivez votre demande en détail...'
    };
    
    if (subjectSelect && messageTextarea) {
        subjectSelect.addEventListener('change', function() {
            const selectedValue = this.value;
            if (helpTexts[selectedValue]) {
                messageTextarea.placeholder = helpTexts[selectedValue];
            } else {
                messageTextarea.placeholder = '';
            }
        });
    }

    // Gestion de l'envoi du formulaire
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Récupération des données
            const prenom = document.getElementById('firstName').value.trim();
            const nomFamille = document.getElementById('lastName').value.trim();
            const nomComplet = `${prenom} ${nomFamille}`;
            
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const subject = document.getElementById('subject').value;
            const messageBrut = document.getElementById('message').value.trim();
            
            // Formatage du message pour inclure le téléphone et le sujet
            const messageFinal = `[Sujet: ${subject}] [Tel: ${phone || 'Non renseigné'}]\n\n${messageBrut}`;

            // Changement d'état du bouton
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Envoi en cours...';
            feedbackDiv.innerHTML = '';

            try {
                // Envoi à Supabase (table messages_contact)
                const { error } = await window.supabaseClient
                    .from('messages_contact')
                    .insert([{ 
                        nom: nomComplet, 
                        email: email, 
                        message: messageFinal 
                    }]);

                if (error) throw error;

                // Succès
                feedbackDiv.innerHTML = `
                    <div class="alert alert-success mt-3 fw-bold rounded-3">
                        <i class="fas fa-check-circle me-2"></i>Votre message a été envoyé avec succès ! Nous vous répondrons très vite.
                    </div>`;
                contactForm.reset();

            } catch (error) {
                console.error("Erreur lors de l'envoi du message:", error);
                feedbackDiv.innerHTML = `
                    <div class="alert alert-danger mt-3 fw-bold rounded-3">
                        <i class="fas fa-exclamation-triangle me-2"></i>Une erreur est survenue lors de l'envoi. Veuillez vérifier votre connexion.
                    </div>`;
            } finally {
                // Rétablissement du bouton
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Envoyer le message';
            }
        });
    }
});