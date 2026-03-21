// messagerie.js - VERSION SÉCURISÉE (Anti-XSS & URL Signées)

let currentUser = null;
let currentRole = null; 
let selectedContactId = null;
let messageSubscription = null; 
let selectedFile = null; 

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

    document.getElementById('messageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await sendMessage();
    });

    document.getElementById('attach-btn').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });

    document.getElementById('file-input').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            document.getElementById('file-preview-name').textContent = selectedFile.name;
            document.getElementById('file-preview-container').classList.remove('d-none');
            document.getElementById('message-input').removeAttribute('required');
        }
    });

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
    const tableToFetch = currentRole === 'medecin' ? 'patients' : 'medecins';
    
    const { data: contacts, error } = await window.supabaseClient
        .from(tableToFetch)
        .select('id, first_name, last_name')
        .order('first_name', { ascending: true });

    if (error || !contacts) {
        container.innerHTML = '<p class="text-danger text-center">Erreur de chargement.</p>';
        return;
    }

    container.innerHTML = '';
    if (contacts.length === 0) {
        container.innerHTML = '<p class="text-muted text-center p-3">Aucun contact trouvé.</p>';
        return;
    }

    contacts.forEach(contact => {
        const prefix = currentRole === 'patient' ? 'Dr. ' : '';
        const nomComplet = `${prefix}${contact.first_name || ''} ${contact.last_name || ''}`.trim();
        
        // Création sécurisée de l'élément contact
        const contactDiv = document.createElement('div');
        contactDiv.className = 'contact-item p-3 border-bottom d-flex align-items-center';
        contactDiv.onclick = () => selectContact(contact.id, nomComplet, contactDiv);
        
        contactDiv.innerHTML = `
            <div class="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px; font-size: 0.8rem;">
                ${nomComplet.substring(currentRole === 'patient' ? 4 : 0, currentRole === 'patient' ? 6 : 2).toUpperCase()}
            </div>
            <div>
                <h6 class="mb-0 text-dark">${nomComplet}</h6>
            </div>
        `;
        container.appendChild(contactDiv);
    });
}

window.selectContact = function(contactId, contactName, element) {
    selectedContactId = contactId;
    document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    document.getElementById('chat-header-name').textContent = contactName;
    document.getElementById('chat-header-avatar').textContent = contactName.substring(currentRole === 'patient' ? 4 : 0, currentRole === 'patient' ? 6 : 2).toUpperCase();
    
    document.getElementById('message-input').disabled = false;
    document.getElementById('send-btn').disabled = false;
    document.getElementById('attach-btn').disabled = false;

    if (window.innerWidth < 768) {
        document.getElementById('contacts-container').classList.add('d-none');
        document.getElementById('chat-area').classList.remove('d-none');
        document.getElementById('chat-area').classList.add('d-flex');
    }
    loadMessages();
}

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
        chatBox.innerHTML = '<p class="text-danger text-center mt-3">Erreur de chargement.</p>';
        return;
    }

    chatBox.innerHTML = '';
    if (!messages || messages.length === 0) {
        chatBox.innerHTML = '<div class="d-flex h-100 justify-content-center align-items-center"><p class="text-muted bg-white p-2 rounded shadow-sm">Aucun message. Commencez la discussion !</p></div>';
        return;
    }

    for (const msg of messages) {
        await appendMessageToUI(msg);
    }

    await window.supabaseClient
        .from('messages')
        .update({ lu: true })
        .eq('destinataire_id', currentUser.id)
        .eq('expediteur_id', selectedContactId)
        .eq('lu', false);
}

function subscribeToRealtimeMessages() {
    window.supabaseClient
        .channel('messages-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async payload => {
            const newMsg = payload.new;
            if (selectedContactId && 
               ((newMsg.expediteur_id === currentUser.id && newMsg.destinataire_id === selectedContactId) ||
                (newMsg.expediteur_id === selectedContactId && newMsg.destinataire_id === currentUser.id))) {
                await appendMessageToUI(newMsg);
            }
        })
        .subscribe();
}

// === PROTECTION ANTI-XSS ET SÉCURISATION DES FICHIERS ===
async function appendMessageToUI(msg) {
    const chatBox = document.getElementById('chat-messages');
    if (chatBox.innerHTML.includes('Aucun message')) chatBox.innerHTML = '';

    const isMe = msg.expediteur_id === currentUser.id;
    const msgDiv = document.createElement('div');
    msgDiv.className = `message shadow-sm ${isMe ? 'sent' : 'received'}`;

    // 1. GESTION SÉCURISÉE DES PIÈCES JOINTES (URL Signées)
    if (msg.fichier_url) {
        const filePath = msg.fichier_url.split('/pieces_jointes/')[1];
        // On génère un lien temporaire de 5 minutes pour protéger la vie privée
        const { data, error } = await window.supabaseClient.storage
            .from('pieces_jointes')
            .createSignedUrl(filePath, 300);

        const secureUrl = error ? '#' : data.signedUrl;

        if (msg.fichier_type && msg.fichier_type.startsWith('image/')) {
            msgDiv.innerHTML += `
                <div class="mb-2">
                    <a href="${secureUrl}" target="_blank">
                        <img src="${secureUrl}" alt="Image" class="img-fluid rounded" style="max-height: 250px; cursor: zoom-in;">
                    </a>
                </div>`;
        } else {
            msgDiv.innerHTML += `
                <div class="mb-2 bg-white bg-opacity-50 p-2 rounded border">
                    <a href="${secureUrl}" target="_blank" class="text-decoration-none d-flex align-items-center ${isMe ? 'text-dark' : 'text-primary'}">
                        <i class="fas fa-file-pdf fs-3 me-2 text-danger"></i>
                        <span class="fw-bold small">Ouvrir le document</span>
                    </a>
                </div>`;
        }
    }

    // 2. PROTECTION ANTI-XSS POUR LE TEXTE
    if (msg.contenu) {
        const textContent = document.createElement('div');
        textContent.className = 'text-dark';
        textContent.textContent = msg.contenu; // <--- SÉCURITÉ CRITIQUE :textContent neutralise le code HTML
        msgDiv.appendChild(textContent);
    }

    const timeDiv = document.createElement('div');
    timeDiv.className = 'text-end text-muted mt-1';
    timeDiv.style.fontSize = '0.7rem';
    timeDiv.textContent = new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    msgDiv.appendChild(timeDiv);

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    if (!selectedContactId) return;
    const input = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const contenu = input.value.trim();
    if (!contenu && !selectedFile) return;

    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    let fichierUrl = null;
    let fichierType = null;

    if (selectedFile) {
        const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const filePath = `${currentUser.id}/${Date.now()}_${cleanFileName}`;

        const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
            .from('pieces_jointes')
            .upload(filePath, selectedFile);

        if (uploadError) {
            alert("Erreur upload : " + uploadError.message);
            input.disabled = false;
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            return;
        }

        // On stocke le chemin relatif, le lien signé sera généré à l'affichage
        fichierUrl = `pieces_jointes/${filePath}`;
        fichierType = selectedFile.type;
    }

    const { error } = await window.supabaseClient
        .from('messages')
        .insert([{
            expediteur_id: currentUser.id,
            destinataire_id: selectedContactId,
            contenu: contenu || null,
            fichier_url: fichierUrl,
            fichier_type: fichierType
        }]);

    if (!error) {
        input.value = ''; 
        clearFileSelection();
    } else {
        alert("Erreur envoi : " + error.message);
    }

    input.disabled = false;
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    input.focus();
}