// profil.js - VERSION FINALE (Multi-Rôles + Tarifs + Retour Intelligent)

let currentUser = null;
let currentRole = null; 

document.addEventListener('DOMContentLoaded', () => {
    initProfile();
    setupAvatarUpload(); 
});

async function initProfile() {
    // 1. Vérification de la session
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    if (authError || !user) {
        window.location.href = "./connexion.html";
        return;
    }
    currentUser = user;
    document.getElementById('email-input').value = user.email;

    // 2. Détection du rôle et Affichage dynamique
    const { data: medecinData } = await window.supabaseClient
        .from('medecins')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (medecinData) {
        currentRole = 'medecin';
        document.getElementById('role-badge').textContent = "Médecin";
        document.getElementById('role-badge').classList.replace('bg-secondary', 'bg-success');
        
        // --- CORRECTION : Affichage forcé de la section médecin ---
        const doctorSection = document.getElementById('doctor-only-fields');
        if (doctorSection) {
            doctorSection.style.display = 'block';
        }
        
        // Mise à jour du lien de retour pour le médecin
        const backBtn = document.getElementById('back-to-dashboard');
        if (backBtn) {
            backBtn.href = "dashboard-medecin.html";
        }

        fillForm(medecinData);
    } else {
        const { data: patientData } = await window.supabaseClient
            .from('patients')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
            
        if (patientData) {
            currentRole = 'patient';
            document.getElementById('role-badge').textContent = "Patient";
            document.getElementById('role-badge').classList.replace('bg-secondary', 'bg-info');
            
            // Mise à jour du lien de retour pour le patient
            const backBtn = document.getElementById('back-to-dashboard');
            if (backBtn) {
                backBtn.href = "dashboard.html";
            }

            fillForm(patientData);
        }
    }

    // 3. Sauvegarde du formulaire
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
            updateData.moyen_paiement = document.getElementById('moyen-paiement').value;
            updateData.coordonnees_paiement = document.getElementById('coordonnees-paiement').value;
            updateData.tarif_video = parseInt(document.getElementById('tarif-video').value) || 5000;
            updateData.tarif_domicile = parseInt(document.getElementById('tarif-domicile').value) || 15000;
        }

        const { error } = await window.supabaseClient
            .from(tableToUpdate)
            .update(updateData)
            .eq('id', currentUser.id);

        if (error) {
            alert("Erreur : " + error.message);
        } else {
            alert("✅ Profil mis à jour !");
            updateAvatarDisplay(updateData.first_name, updateData.last_name);
        }

        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

function fillForm(data) {
    document.getElementById('prenom-input').value = data.first_name || '';
    document.getElementById('nom-input').value = data.last_name || '';
    document.getElementById('telephone-input').value = data.telephone || '';
    
    if (currentRole === 'medecin') {
        document.getElementById('specialite-input').value = data.specialite || '';
        document.getElementById('moyen-paiement').value = data.moyen_paiement || 'Wave';
        document.getElementById('coordonnees-paiement').value = data.coordonnees_paiement || '';
        document.getElementById('tarif-video').value = data.tarif_video || 5000;
        document.getElementById('tarif-domicile').value = data.tarif_domicile || 15000;
    }

    const avatarContainer = document.getElementById('profile-avatar');
    if (data.avatar_url) {
        avatarContainer.innerHTML = `<img src="${data.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
        updateAvatarDisplay(data.first_name, data.last_name);
    }
}

function updateAvatarDisplay(fn, ln) {
    const avatarContainer = document.getElementById('profile-avatar');
    if (!avatarContainer.querySelector('img')) {
        const initiales = ((fn ? fn[0] : '') + (ln ? ln[0] : '')).toUpperCase() || '<i class="fas fa-user"></i>';
        avatarContainer.innerHTML = initiales;
    }
}

function setupAvatarUpload() {
    const avatarUpload = document.getElementById('avatar-upload');
    if (!avatarUpload) return;

    avatarUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const avatarContainer = document.getElementById('profile-avatar');
        avatarContainer.innerHTML = '<i class="fas fa-spinner fa-spin text-white"></i>';

        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${currentRole}s/${currentUser.id}.${fileExt}`; 

            const { error: uploadError } = await window.supabaseClient.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const tableToUpdate = currentRole === 'medecin' ? 'medecins' : 'patients';
            await window.supabaseClient.from(tableToUpdate).update({ avatar_url: publicUrl }).eq('id', currentUser.id);

            avatarContainer.innerHTML = `<img src="${publicUrl}?t=${Date.now()}" style="width: 100%; height: 100%; object-fit: cover;">`;
            
        } catch (error) {
            alert("Erreur photo : " + error.message);
            initProfile();
        }
    });
}