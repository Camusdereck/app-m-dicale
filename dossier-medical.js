// dossier-medical.js (Version Complète et Définitive)
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = "./connexion.html";
        return;
    }
    currentUser = user;

    loadMedicalData();
    loadHistorique();
    loadDocuments();

    document.getElementById('medicalRecordForm').addEventListener('submit', saveNewRecord);
});

// --- 1. CHARGEMENT PROFIL & ANTÉCÉDENTS ---
async function loadMedicalData() {
    const { data, error } = await window.supabaseClient
        .from('patients')
        .select('antecedents_medicaux, avatar_url')
        .eq('id', currentUser.id)
        .maybeSingle();

    if (data) {
        document.getElementById('antecedents-input').value = data.antecedents_medicaux || '';
        if (data.avatar_url) {
            document.getElementById('profile-img-preview').src = data.avatar_url;
        }
    }
}

// --- 2. UPLOAD DE LA PHOTO (CORRECTION BUG 400) ---
window.uploadAvatar = async function() {
    const fileInput = document.getElementById('avatar-input');
    const btn = document.getElementById('btn-upload-avatar');
    if (!fileInput.files || fileInput.files.length === 0) return alert("Sélectionnez une image.");

    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    // On crée un nom de fichier unique et propre
    const filePath = `patients/${currentUser.id}_${Date.now()}.${fileExt}`;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        // Upload dans le bucket 'avatars' (avec upsert pour écraser l'ancienne si besoin)
        const { error: uploadError } = await window.supabaseClient.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = window.supabaseClient.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // Mise à jour de la table patients
        await window.supabaseClient.from('patients').update({ avatar_url: publicUrlData.publicUrl }).eq('id', currentUser.id);
        
        document.getElementById('profile-img-preview').src = publicUrlData.publicUrl;
        alert("Photo mise à jour !");
    } catch (err) {
        alert("Erreur upload : " + err.message);
    } finally {
        btn.innerHTML = 'Mettre à jour la photo';
        btn.disabled = false;
    }
}

// --- 3. SAUVEGARDE ET HISTORIQUE (LES 15 PRISES) ---
async function saveNewRecord(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-record');
    btn.disabled = true;

    const poids = document.getElementById('poids-input').value;
    const tension = document.getElementById('tension-input').value;
    const antecedents = document.getElementById('antecedents-input').value;

    try {
        // Mise à jour des antécédents dans le profil
        await window.supabaseClient.from('patients').update({ antecedents_medicaux: antecedents }).eq('id', currentUser.id);

        // Ajout d'une nouvelle ligne dans l'historique (constantes_vitales)
        if (poids || tension) {
            await window.supabaseClient.from('constantes_vitales').insert([{
                patient_id: currentUser.id,
                poids: poids ? parseFloat(poids) : null,
                tension: tension || null
            }]);
        }
        alert("Données enregistrées !");
        document.getElementById('poids-input').value = '';
        document.getElementById('tension-input').value = '';
        loadHistorique(); // On rafraîchit le tableau
    } catch (err) {
        alert("Erreur : " + err.message);
    } finally {
        btn.disabled = false;
    }
}

async function loadHistorique() {
    const tbody = document.getElementById('historique-list');
    const { data, error } = await window.supabaseClient
        .from('constantes_vitales')
        .select('*')
        .eq('patient_id', currentUser.id)
        .order('date_prise', { ascending: false })
        .limit(15); // Les 15 dernières prises demandées par le client

    if (error || !data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center small text-muted">Aucune donnée enregistrée.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    data.forEach(item => {
        const dateFr = new Date(item.date_prise).toLocaleDateString('fr-FR');
        tbody.innerHTML += `
            <tr>
                <td class="small">${dateFr}</td>
                <td class="fw-bold text-primary">${item.poids ? item.poids + ' kg' : '-'}</td>
                <td class="fw-bold text-danger">${item.tension || '-'}</td>
            </tr>
        `;
    });
}

// --- 4. TÉLÉCHARGEMENT DES RÉSULTATS ET ORDONNANCES ---
async function loadDocuments() {
    const list = document.getElementById('documents-list');
    
    // On va chercher dans la messagerie tous les messages destinés au patient qui contiennent un fichier
    const { data: messages, error } = await window.supabaseClient
        .from('messages')
        .select('created_at, fichier_url, medecins(first_name, last_name)')
        .eq('destinataire_id', currentUser.id)
        .not('fichier_url', 'is', null)
        .order('created_at', { ascending: false });

    if (error || !messages || messages.length === 0) {
        list.innerHTML = '<li class="list-group-item text-center text-muted small border-0">Aucun document reçu.</li>';
        return;
    }

    list.innerHTML = '';
    for (const msg of messages) {
        // Création d'un lien sécurisé temporaire (valable 60 secondes) pour le téléchargement
        let filePath = msg.fichier_url.includes('pieces_jointes/') ? msg.fichier_url.split('pieces_jointes/')[1] : msg.fichier_url;
        const { data: urlData } = await window.supabaseClient.storage.from('pieces_jointes').createSignedUrl(filePath, 60);
        
        const nomDoc = filePath.split('_').pop() || 'Document médical';
        const dateFr = new Date(msg.created_at).toLocaleDateString('fr-FR');
        const medecinNom = msg.medecins ? `Dr. ${msg.medecins.last_name}` : 'Médecin';

        list.innerHTML += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-0 fw-bold small text-dark"><i class="fas fa-file-medical text-primary me-2"></i>${nomDoc}</h6>
                    <small class="text-muted">Envoyé par ${medecinNom} le ${dateFr}</small>
                </div>
                <a href="${urlData?.signedUrl || '#'}" target="_blank" class="btn btn-sm btn-light border fw-bold text-primary">
                    <i class="fas fa-download"></i> Ouvrir
                </a>
            </li>
        `;
    }
}