let currentUser = null;
let tousLesMedecins = [];

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    if (authError || !user) {
        alert("Vous devez être connecté.");
        window.location.href = "./connexion.html";
        return;
    }
    currentUser = user;

    const dateInput = document.getElementById('date-input');
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);

    await loadSpecialtiesAndDoctors();

    document.getElementById('specialite-select').addEventListener('change', afficherMedecins);

    const form = document.getElementById('domicileForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('submitBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enregistrement...';
        btn.disabled = true;

        const commune = document.getElementById('commune-input').value;
        const medecinId = document.getElementById('medecin-id-hidden').value; 
        const adresse = document.getElementById('adresse-input').value;
        const motif = document.getElementById('motif-input').value;
        const dateStr = document.getElementById('date-input').value;
        const datetimeStr = `${dateStr}T08:00:00`;

        const { error } = await window.supabaseClient
            .from('rendez_vous')
            .insert([{
                patient_id: currentUser.id,
                medecin_id: medecinId,
                date_heure: datetimeStr,
                motif: motif,
                statut: 'en_attente',
                type_consultation: 'domicile',
                commune: commune,
                adresse_exacte: adresse
            }]);

        if (error) {
            alert("Erreur lors de la demande : " + error.message);
            btn.innerHTML = originalText;
            btn.disabled = false;
        } else {
            btn.classList.replace('btn-primary', 'btn-success');
            btn.innerHTML = '<i class="fas fa-check-double me-2"></i>Réservation confirmée !';
            setTimeout(() => { window.location.href = './dashboard.html'; }, 2000);
        }
    });
});

async function loadSpecialtiesAndDoctors() {
    const select = document.getElementById('specialite-select');
    
    // Récupération des médecins et de leurs notes
    const { data: medecins, error } = await window.supabaseClient
        .from('medecins')
        .select('id, first_name, last_name, specialite, note_moyenne');

    if (error || !medecins || medecins.length === 0) {
        select.innerHTML = '<option value="">Aucun médecin disponible</option>';
        return;
    }

    tousLesMedecins = medecins;

    const specialitesUniques = [...new Set(medecins.map(m => m.specialite).filter(s => s))];
    
    select.innerHTML = '<option value="" selected disabled>Choisissez une spécialité...</option>';
    specialitesUniques.forEach(spec => {
        select.innerHTML += `<option value="${spec}">${spec}</option>`;
    });
}

function afficherMedecins(e) {
    const specialiteChoisie = e.target.value;
    const grid = document.getElementById('doctors-grid');
    grid.style.display = 'flex';
    grid.innerHTML = ''; 

    // Filtrer et trier par la note (Les meilleurs en haut)
    let medecinsFiltres = tousLesMedecins
        .filter(m => m.specialite === specialiteChoisie)
        .sort((a, b) => (b.note_moyenne || 0) - (a.note_moyenne || 0));

    if (medecinsFiltres.length === 0) {
        grid.innerHTML = '<div class="col-12 text-muted text-center py-3">Aucun médecin pour cette spécialité.</div>';
        return;
    }

    medecinsFiltres.forEach(med => {
        const nomComplet = `Dr. ${med.first_name || ''} ${med.last_name || ''}`;
        const note = med.note_moyenne ? parseFloat(med.note_moyenne).toFixed(1) : 'Nouveau';
        
        let starsHTML = '';
        if (note !== 'Nouveau') {
            for(let i=1; i<=5; i++) {
                starsHTML += i <= Math.round(note) ? '<i class="fas fa-star text-warning"></i>' : '<i class="far fa-star text-warning"></i>';
            }
        }

        const card = document.createElement('div');
        card.className = 'col-md-6';
        card.innerHTML = `
            <div class="card border-0 shadow-sm h-100" style="border-left: 4px solid var(--danger) !important;">
                <div class="card-body d-flex align-items-center">
                    <div class="bg-light text-danger rounded-circle d-flex justify-content-center align-items-center me-3 fw-bold fs-5" style="width: 50px; height: 50px;">
                        ${(med.first_name ? med.first_name[0] : '')}${(med.last_name ? med.last_name[0] : '')}
                    </div>
                    <div>
                        <h6 class="fw-bold mb-1">${nomComplet}</h6>
                        <div class="small mb-2">${starsHTML} <span class="text-muted ms-1">(${note})</span></div>
                        <button class="btn btn-sm btn-outline-danger fw-bold" onclick="passerAEtape2('${med.id}', '${nomComplet.replace(/'/g, "\\'")}')">
                            <i class="fas fa-ambulance me-1"></i> Demander une visite
                        </button>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.passerAEtape2 = function(medecinId, medecinNom) {
    document.getElementById('step-1').style.display = 'none';
    document.getElementById('step-2').style.display = 'block';
    
    document.getElementById('medecin-id-hidden').value = medecinId;
    document.getElementById('medecin-choisi-nom').textContent = medecinNom;
}

window.retourEtape1 = function() {
    document.getElementById('step-2').style.display = 'none';
    document.getElementById('step-1').style.display = 'block';
}