// profil.js - VERSION FINALE AVEC UPLOAD D'AVATAR

let currentUser = null;
let currentRole = null; // 'patient' ou 'medecin'

document.addEventListener('DOMContentLoaded', () => {
    initProfile();
    setupAvatarUpload(); // Initialisation de l'upload
});

async function initProfile() {
    // 1. Vérifier qui est connecté
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    if (authError || !user) {
        window.location.href = "./connexion.html";
        return;
    }
    currentUser = user;
    document.getElementById('email-input').value = user.email;

    // 2. Déterminer si c'est un patient ou un médecin
    const { data: medecinData } = await window.supabaseClient
        .from('medecins')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (medecinData) {
        currentRole = 'medecin';
        document.getElementById('role-badge').textContent = "Médecin";
        document.getElementById('role-badge').classList.replace('bg-secondary', 'bg-success');
        document.getElementById('doctor-fields').style.display = 'block';
        fillForm(medecinData);
    } else {
        // Si ce n'est pas un médecin, c'est un patient
        const { data: patientData } = await window.supabaseClient
            .from('patients')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
            
        if (patientData) {
            currentRole = 'patient';
            document.getElementById('role-badge').textContent = "Patient";
            document.getElementById('role-badge').classList.replace('bg-secondary', 'bg-info');
            fillForm(patientData);
        }
    }

    // 3. Gérer la sauvegarde du formulaire texte
    const form = document.getElementById('profileForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('saveProfileBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sauvegarde...';
        btn.disabled = true;

        const tableToUpdate = currentRole === 'medecin' ? 'medecins' : 'patients';
        const updateData = {
            first_name: document.getElementById('prenom-input').value,
            last_name: document.getElementById('nom-input').value,
            telephone: document.getElementById('telephone-input').value
        };

        if (currentRole === 'medecin') {
            updateData.specialite = document.getElementById('specialite-input').value;
        }

        const { error } = await window.supabaseClient
            .from(tableToUpdate)
            .update(updateData)
            .eq('id', currentUser.id);

        if (error) {
            alert("Erreur lors de la mise à jour : " + error.message);
        } else {
            alert("✅ Votre profil a été mis à jour avec succès !");
            
            // On met à jour les initiales SEULEMENT s'il n'y a pas déjà une photo
            const avatarContainer = document.getElementById('profile-avatar');
            if (!avatarContainer.querySelector('img')) {
                const initiales = (updateData.first_name.charAt(0) + updateData.last_name.charAt(0)).toUpperCase();
                avatarContainer.innerHTML = initiales;
            }
        }

        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

function fillForm(data) {
    if (data.first_name) document.getElementById('prenom-input').value = data.first_name;
    if (data.last_name) document.getElementById('nom-input').value = data.last_name;
    if (data.telephone) document.getElementById('telephone-input').value = data.telephone;
    
    if (currentRole === 'medecin' && data.specialite) {
        document.getElementById('specialite-input').value = data.specialite;
    }

    // Affichage de l'avatar : Photo si elle existe, sinon Initiales
    const avatarContainer = document.getElementById('profile-avatar');
    if (data.avatar_url) {
        avatarContainer.innerHTML = `<img src="${data.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else if (data.first_name || data.last_name) {
        const initiales = ((data.first_name ? data.first_name.charAt(0) : '') + (data.last_name ? data.last_name.charAt(0) : '')).toUpperCase();
        avatarContainer.innerHTML = initiales;
    }
}

// 4. Fonction dédiée à l'upload de la photo de profil
function setupAvatarUpload() {
    const avatarUpload = document.getElementById('avatar-upload');
    if (!avatarUpload) return;

    avatarUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const avatarContainer = document.getElementById('profile-avatar');
        const originalContent = avatarContainer.innerHTML;
        
        // Afficher un loader pendant l'upload
        avatarContainer.innerHTML = '<i class="fas fa-spinner fa-spin text-white"></i>';

        try {
            // Créer un nom de fichier unique basé sur l'ID de l'utilisateur
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser.id}.${fileExt}`;
            const filePath = `${currentRole}s/${fileName}`; // Ex: patients/123.jpg ou medecins/456.jpg

            // 1. Envoyer l'image dans le bucket 'avatars' (upsert: true permet d'écraser l'ancienne photo)
            const { error: uploadError } = await window.supabaseClient.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 2. Récupérer l'URL publique de l'image
            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Ajouter un timestamp à l'URL pour forcer le navigateur à recharger la nouvelle image (éviter le cache)
            const imageUrlWithCacheBuster = `${publicUrl}?t=${new Date().getTime()}`;

            // 3. Sauvegarder l'URL dans la table correspondante (patients ou medecins)
            const tableToUpdate = currentRole === 'medecin' ? 'medecins' : 'patients';
            const { error: dbError } = await window.supabaseClient
                .from(tableToUpdate)
                .update({ avatar_url: publicUrl }) 
                .eq('id', currentUser.id);

            if (dbError) throw dbError;

            // 4. Mettre à jour l'interface visuelle
            avatarContainer.innerHTML = `<img src="${imageUrlWithCacheBuster}" style="width: 100%; height: 100%; object-fit: cover;">`;
            
        } catch (error) {
            console.error("Erreur lors de l'upload:", error);
            alert("Erreur lors de la mise à jour de la photo. Veuillez réessayer.");
            avatarContainer.innerHTML = originalContent; // Remettre les initiales en cas d'erreur
        }
    });
}