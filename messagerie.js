// messagerie.js - VERSION FINALE (Temps réel + Pièces jointes)

let currentUser = null;
let currentRole = null; 
let selectedContactId = null;
let messageSubscription = null; 
let selectedFile = null; // NOUVEAU : Va stocker le fichier en attente d'envoi

document.addEventListener('DOMContentLoaded', () => {
    initMessagerie();
});

async function initMessagerie() {
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    if (authError || !user) {
        window.location.href = "./connexion.html";
        return;
    }
    currentUser = user;

    const { data: docCheck } = await window.supabaseClient.from('medecins').select('id').eq('id', user.id).maybeSingle();
    currentRole = docCheck ? 'medecin' : 'patient';

    await loadContacts();
    subscribeToRealtimeMessages();

    // Gérer l'envoi de message (Texte + Fichier)
    document.getElementById('messageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await sendMessage();
    });

    // NOUVEAU : Gérer le clic sur le trombone
    document.getElementById('attach-btn').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });

    // NOUVEAU : Gérer la sélection d'un fichier
    document.getElementById('file-input').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            document.getElementById('file-preview-name').textContent = selectedFile.name;
            document.getElementById('file-preview-container').classList.remove('d-none');
            // Si on choisit un fichier, on autorise l'envoi même sans texte
            document.getElementById('message-input').removeAttribute('required');
        }
    });

    // NOUVEAU : Annuler la sélection du fichier
    document.getElementById('remove-file-btn').addEventListener('click', () => {
        clearFileSelection();
    });
}

function clearFileSelection() {
    selectedFile = null;
    document.getElementById('file-input').value = '';
    document.getElementById('file-preview-container').classList.add('d-none');
    document.getElementById('message-input').setAttribute('required', 'true');
}

async function loadContacts() {
    const container = document.getElementById('contacts-list');
    let contacts = [];

    const tableToFetch = currentRole === 'medecin' ? 'patients' : 'medecins';
    
    const { data, error } = await window.supabaseClient
        .from(tableToFetch)
        .select('id, first_name, last_name')
        .order('first_name', { ascending: true });

    if (error || !data) {
        container.innerHTML = '<p class="text-danger text-center">Erreur de chargement.</p>';
        return;
    }

    contacts = data;
    container.innerHTML = '';

    if (contacts.length === 0) {
        container.innerHTML = '<p class="text-muted text-center p-3">Aucun contact trouvé.</p>';
        return;
    }

    contacts.forEach(contact => {
        const prefix = currentRole === 'patient' ? 'Dr. ' : '';
        const nomComplet = `${prefix}${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Utilisateur inconnu';
        
        container.innerHTML += `
            <div class="contact-item p-3 border-bottom d-flex align-items-center" data-id="${contact.id}" data-name="${nomComplet}" onclick="selectContact('${contact.id}', '${nomComplet}', this)">
                <div class="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px; font-size: 0.8rem;">
                    ${nomComplet.substring(currentRole === 'patient' ? 4 : 0, currentRole === 'patient' ? 6 : 2).toUpperCase()}
                </div>
                <div>
                    <h6 class="mb-0 text-dark">${nomComplet}</h6>
                </div>
            </div>
        `;
    });
}

window.selectContact = function(contactId, contactName, element) {
    selectedContactId = contactId;
    
    document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    document.getElementById('chat-header-name').textContent = contactName;
    document.getElementById('chat-header-avatar').innerHTML = contactName.substring(currentRole === 'patient' ? 4 : 0, currentRole === 'patient' ? 6 : 2).toUpperCase();
    
    document.getElementById('message-input').disabled = false;
    document.getElementById('send-btn').disabled = false;
    document.getElementById('attach-btn').disabled = false;

    // === GESTION DU MOBILE : Cacher la liste et afficher le chat ===
    if (window.innerWidth < 768) {
        document.getElementById('contacts-container').classList.add('d-none');
        document.getElementById('chat-area').classList.remove('d-none');
        document.getElementById('chat-area').classList.add('d-flex');
    }

    loadMessages();
}

// === FONCTION DU BOUTON RETOUR (Sur Mobile) ===
window.showContactsList = function() {
    document.getElementById('chat-area').classList.remove('d-flex');
    document.getElementById('chat-area').classList.add('d-none');
    document.getElementById('contacts-container').classList.remove('d-none');
};

async function loadMessages() {
    if (!selectedContactId) return;

    const chatBox = document.getElementById('chat-messages');
    chatBox.innerHTML = '<p class="text-center text-muted mt-3"><i class="fas fa-spinner fa-spin"></i> Chargement...</p>';

    const { data: messages, error } = await window.supabaseClient
        .from('messages')
        .select('*')
        .or(`and(expediteur_id.eq.${currentUser.id},destinataire_id.eq.${selectedContactId}),and(expediteur_id.eq.${selectedContactId},destinataire_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

    if (error) {
        chatBox.innerHTML = '<p class="text-danger text-center mt-3">Erreur de chargement des messages.</p>';
        return;
    }

    chatBox.innerHTML = '';

    if (!messages || messages.length === 0) {
        chatBox.innerHTML = '<div class="d-flex h-100 justify-content-center align-items-center"><p class="text-muted bg-white p-2 rounded shadow-sm">Aucun message. Commencez la discussion !</p></div>';
        return;
    }

    messages.forEach(msg => appendMessageToUI(msg));

    await window.supabaseClient
        .from('messages')
        .update({ lu: true })
        .eq('destinataire_id', currentUser.id)
        .eq('expediteur_id', selectedContactId)
        .eq('lu', false);
}

function subscribeToRealtimeMessages() {
    messageSubscription = window.supabaseClient
        .channel('messages-channel')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages' 
        }, payload => {
            const newMsg = payload.new;
            
            if (selectedContactId && 
               ((newMsg.expediteur_id === currentUser.id && newMsg.destinataire_id === selectedContactId) ||
                (newMsg.expediteur_id === selectedContactId && newMsg.destinataire_id === currentUser.id))) {
                
                appendMessageToUI(newMsg);
            }
        })
        .subscribe();
}

// NOUVEAU : Fonction modifiée pour afficher les images et les documents
function appendMessageToUI(msg) {
    const chatBox = document.getElementById('chat-messages');
    
    if (chatBox.innerHTML.includes('Aucun message')) {
        chatBox.innerHTML = '';
    }

    const isMe = msg.expediteur_id === currentUser.id;
    const msgClass = isMe ? 'sent' : 'received';
    const timeStr = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    let mediaHTML = '';

    // Si le message contient un fichier joint
    if (msg.fichier_url) {
        // Si c'est une image
        if (msg.fichier_type && msg.fichier_type.startsWith('image/')) {
            mediaHTML = `
                <div class="mb-2">
                    <a href="${msg.fichier_url}" target="_blank">
                        <img src="${msg.fichier_url}" alt="Image jointe" class="img-fluid rounded" style="max-height: 250px; cursor: zoom-in;">
                    </a>
                </div>
            `;
        } 
        // Si c'est un autre document (PDF, DOCX, etc.)
        else {
            mediaHTML = `
                <div class="mb-2 bg-white bg-opacity-50 p-2 rounded border border-secondary border-opacity-25">
                    <a href="${msg.fichier_url}" target="_blank" class="text-decoration-none d-flex align-items-center ${isMe ? 'text-dark' : 'text-primary'}">
                        <i class="fas fa-file-pdf fs-3 me-2 text-danger"></i>
                        <span class="fw-bold small text-truncate">Ouvrir le document</span>
                    </a>
                </div>
            `;
        }
    }

    // On n'affiche le texte que s'il y en a un
    const textHTML = msg.contenu ? `<div class="text-dark">${msg.contenu}</div>` : '';

    chatBox.innerHTML += `
        <div class="message shadow-sm ${msgClass}">
            ${mediaHTML}
            ${textHTML}
            <div class="text-end text-muted mt-1" style="font-size: 0.7rem;">${timeStr}</div>
        </div>
    `;
    
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ==========================================
// ENVOI DU MESSAGE (AVEC OU SANS FICHIER)
// ==========================================
async function sendMessage() {
    if (!selectedContactId) return;

    const input = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const contenu = input.value.trim();
    
    // On bloque si c'est totalement vide (pas de texte ET pas de fichier)
    if (!contenu && !selectedFile) return;

    // Désactiver l'interface pendant l'envoi
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Effet de chargement

    let fichierUrl = null;
    let fichierType = null;

    // 1. SI UN FICHIER EST SÉLECTIONNÉ : ON L'UPLOAD D'ABORD
    if (selectedFile) {
        // Nettoyer le nom du fichier et ajouter un timestamp pour éviter les doublons
        const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const filePath = `${currentUser.id}/${Date.now()}_${cleanFileName}`;

        // Upload vers le bucket 'pieces_jointes'
        const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
            .from('pieces_jointes')
            .upload(filePath, selectedFile);

        if (uploadError) {
            alert("Erreur lors de l'envoi du fichier : " + uploadError.message);
            input.disabled = false;
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            return; // On arrête tout si l'upload échoue
        }

        // Récupérer l'URL publique du fichier
        const { data: urlData } = window.supabaseClient.storage
            .from('pieces_jointes')
            .getPublicUrl(filePath);
            
        fichierUrl = urlData.publicUrl;
        fichierType = selectedFile.type;
    }

    // 2. ON ENREGISTRE LE MESSAGE DANS LA BASE DE DONNÉES
    const { error } = await window.supabaseClient
        .from('messages')
        .insert([{
            expediteur_id: currentUser.id,
            destinataire_id: selectedContactId,
            contenu: contenu || null, // Peut être null si on n'envoie qu'une image
            fichier_url: fichierUrl,
            fichier_type: fichierType
        }]);

    if (!error) {
        // Succès ! On nettoie tout
        input.value = ''; 
        clearFileSelection();
    } else {
        alert("Erreur lors de l'envoi du message : " + error.message);
    }

    // Rétablir l'interface
    input.disabled = false;
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    input.focus();
}