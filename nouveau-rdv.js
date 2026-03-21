let currentUser = null;
let tousLesMedecins = [];
let selectedDoctorConfig = null; 
let bookedTimes = []; 

document.addEventListener('DOMContentLoaded', () => {
    initRdvSystem();
});

async function initRdvSystem() {
    const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
    if (authError || !user) {
        window.location.href = "./connexion.html";
        return;
    }
    currentUser = user;

    const dateInput = document.getElementById('date-input');
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);

    await loadSpecialtiesAndDoctors();

    document.getElementById('specialite-select').addEventListener('change', afficherMedecins);
    dateInput.addEventListener('change', handleDateSelection);
    
    document.getElementById('newAppointmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitRdv();
    });
}

function formatTime(dateObj) {
    const h = dateObj.getHours().toString().padStart(2, '0');
    const m = dateObj.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
}

async function loadSpecialtiesAndDoctors() {
    const select = document.getElementById('specialite-select');
    
    // On récupère le tarif vidéo
    const { data: medecins, error } = await window.supabaseClient
        .from('medecins')
        .select('id, first_name, last_name, specialite, note_moyenne, heure_debut, heure_fin, duree_consultation, tarif_video');

    if (error || !medecins) {
        select.innerHTML = '<option value="" disabled>Erreur de chargement</option>';
        return;
    }

    tousLesMedecins = medecins;

    const specialitesUniques = [...new Set(medecins.map(m => m.specialite).filter(s => s))];
    select.innerHTML = '<option value="" disabled selected>-- Quelle spécialité recherchez-vous ? --</option>';
    specialitesUniques.forEach(spec => {
        select.innerHTML += `<option value="${spec}">${spec}</option>`;
    });
}

function afficherMedecins(e) {
    const specialiteChoisie = e.target.value;
    const grid = document.getElementById('doctors-grid');
    grid.style.display = 'flex';
    grid.innerHTML = ''; 

    let medecinsFiltres = tousLesMedecins
        .filter(m => m.specialite === specialiteChoisie)
        .sort((a, b) => (b.note_moyenne || 0) - (a.note_moyenne || 0));

    if (medecinsFiltres.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center text-muted py-3">Aucun médecin disponible pour le moment.</div>';
        return;
    }

    medecinsFiltres.forEach(med => {
        const nom = `Dr. ${med.first_name || ''} ${med.last_name || ''}`;
        const note = med.note_moyenne ? parseFloat(med.note_moyenne).toFixed(1) : 'Nouveau';
        
        let starsHTML = '';
        if (note !== 'Nouveau') {
            for(let i=1; i<=5; i++) {
                starsHTML += i <= Math.round(note) ? '<i class="fas fa-star text-warning"></i>' : '<i class="far fa-star text-warning"></i>';
            }
        } else {
            starsHTML = '<span class="badge bg-success">Nouveau profil</span>';
        }

        const card = document.createElement('div');
        card.className = 'col-md-6';
        card.innerHTML = `
            <div class="card border-0 shadow-sm h-100" style="border-left: 4px solid var(--primary-dark) !important;">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <div class="bg-light text-primary-dark rounded-circle d-flex justify-content-center align-items-center me-3 fw-bold fs-5" style="width: 50px; height: 50px;">
                            ${med.first_name ? med.first_name[0] : ''}${med.last_name ? med.last_name[0] : ''}
                        </div>
                        <div>
                            <h6 class="fw-bold mb-1">${nom}</h6>
                            <div class="small">${starsHTML} <span class="text-muted ms-1">(${note})</span></div>
                        </div>
                    </div>
                    <button class="btn btn-outline-primary w-100 btn-sm fw-bold" onclick="passerAEtape2('${med.id}', '${nom.replace(/'/g, "\\'")}')">
                        <i class="fas fa-calendar-alt me-2"></i>Prendre Rendez-vous
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.passerAEtape2 = function(medecinId, medecinNom) {
    document.getElementById('step-1').style.display = 'none';
    document.getElementById('step-2').style.display = 'block';
    
    document.getElementById('doctor-id-hidden').value = medecinId;
    document.getElementById('medecin-choisi-nom').textContent = medecinNom;

    const med = tousLesMedecins.find(m => m.id === medecinId);
    selectedDoctorConfig = {
        debut: med.heure_debut || '09:00:00',
        fin: med.heure_fin || '17:00:00',
        duree: parseInt(med.duree_consultation || '30'),
        tarif_video: parseInt(med.tarif_video) || 5000
    };

    // Affiche le prix
    document.getElementById('prix-total-display').textContent = selectedDoctorConfig.tarif_video.toLocaleString('fr-FR') + ' FCFA';
}

window.retourEtape1 = function() {
    document.getElementById('step-2').style.display = 'none';
    document.getElementById('step-1').style.display = 'block';
    document.getElementById('date-input').value = '';
    document.getElementById('time-container').style.display = 'none';
    document.getElementById('motif-container').style.display = 'none';
    document.getElementById('submitBtn').disabled = true;
}

async function handleDateSelection(e) {
    const selectedDate = e.target.value;
    const doctorId = document.getElementById('doctor-id-hidden').value;
    if (!selectedDate || !doctorId) return;

    const slotsContainer = document.getElementById('slots-container');
    document.getElementById('time-container').style.display = 'block';
    slotsContainer.innerHTML = '<p class="text-primary"><i class="fas fa-spinner fa-spin me-2"></i>Recherche des disponibilités...</p>';

    const startOfDay = `${selectedDate}T00:00:00`;
    const endOfDay = `${selectedDate}T23:59:59`;

    const { data: rdvs, error } = await window.supabaseClient
        .from('rendez_vous')
        .select('date_heure')
        .eq('medecin_id', doctorId)
        .gte('date_heure', startOfDay)
        .lte('date_heure', endOfDay)
        .neq('statut', 'annule'); 

    if (error) {
        slotsContainer.innerHTML = '<p class="text-danger">Erreur de vérification.</p>';
        return;
    }

    bookedTimes = rdvs.map(rdv => formatTime(new Date(rdv.date_heure)));
    generateTimeSlots(selectedDate);
}

function generateTimeSlots(selectedDate) {
    const slotsContainer = document.getElementById('slots-container');
    slotsContainer.innerHTML = '';

    let [startHour, startMin] = selectedDoctorConfig.debut.split(':').map(Number);
    let [endHour, endMin] = selectedDoctorConfig.fin.split(':').map(Number);
    
    let currentTime = new Date(2000, 0, 1, startHour, startMin);
    const endTime = new Date(2000, 0, 1, endHour, endMin);
    const now = new Date();
    const isToday = selectedDate === now.toISOString().split('T')[0];

    let slotsAvailable = 0;

    while (currentTime < endTime) {
        const slotHourStr = formatTime(currentTime);
        const isBooked = bookedTimes.includes(slotHourStr);
        
        let isPast = false;
        if (isToday) {
            const currentHourNow = now.getHours();
            const currentMinNow = now.getMinutes();
            if (currentTime.getHours() < currentHourNow || (currentTime.getHours() === currentHourNow && currentTime.getMinutes() <= currentMinNow)) {
                isPast = true;
            }
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-outline-primary m-1 slot-btn fw-bold';
        btn.textContent = slotHourStr;

        if (isBooked || isPast) {
            btn.disabled = true;
            btn.classList.replace('btn-outline-primary', 'btn-light');
            btn.classList.add('text-muted', 'text-decoration-line-through', 'border-0');
        } else {
            slotsAvailable++;
            btn.onclick = () => selectSlot(btn, slotHourStr);
        }

        slotsContainer.appendChild(btn);
        currentTime.setMinutes(currentTime.getMinutes() + selectedDoctorConfig.duree);
    }

    if (slotsAvailable === 0) {
        slotsContainer.innerHTML = '<div class="alert alert-warning w-100"><i class="fas fa-calendar-times me-2"></i>Aucun créneau disponible.</div>';
    }
}

function selectSlot(clickedBtn, timeStr) {
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active', 'text-white'));
    clickedBtn.classList.add('active', 'text-white');
    
    document.getElementById('selected-time').value = timeStr;
    document.getElementById('motif-container').style.display = 'block';
    document.getElementById('motif-container').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    document.getElementById('submitBtn').disabled = false;
}

async function submitRdv() {
    const btn = document.getElementById('submitBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enregistrement...';
    btn.disabled = true;

    const doctorId = document.getElementById('doctor-id-hidden').value;
    const dateStr = document.getElementById('date-input').value; 
    const timeStr = document.getElementById('selected-time').value; 
    const motif = document.getElementById('motif-input').value;
    const datetimeStr = `${dateStr}T${timeStr}:00`;

    const montantTotal = selectedDoctorConfig.tarif_video;
    const margePlateforme = montantTotal * 0.20;
    const partMedecin = montantTotal - margePlateforme;

    // 1. On crée le RDV "en attente" dans la base de données et on récupère son ID
    const { data: rdvCree, error } = await window.supabaseClient
        .from('rendez_vous')
        .insert([{
            patient_id: currentUser.id,
            medecin_id: doctorId,
            date_heure: datetimeStr,
            motif: motif,
            type_consultation: 'video', 
            statut: 'en_attente',
            statut_paiement: 'en_attente',
            montant_total: montantTotal,
            marge_plateforme: margePlateforme,
            part_medecin: partMedecin
        }])
        .select() // On demande à Supabase de nous renvoyer la ligne créée
        .single();

    if (error || !rdvCree) {
        alert("Erreur : " + (error ? error.message : 'Impossible de créer le RDV'));
        btn.innerHTML = '<i class="fas fa-check-circle me-2"></i>Confirmer la demande';
        btn.disabled = false;
        return;
    }

    // 2. On lance le paiement avec l'ID du RDV fraîchement créé
    let handler = PaystackPop.setup({
        key: 'pk_live_54950319772acc4e08a83f4e5946f6b1760ed17e',
        email: currentUser.email,
        amount: montantTotal * 100,
        currency: 'XOF',
        ref: 'MDC_' + Math.floor((Math.random() * 1000000000) + 1),
        
        // --- CORRECTION SÉCURITÉ ---
        metadata: {
            custom_fields: [
                {
                    display_name: "Type",
                    variable_name: "type_paiement",
                    value: "rendez_vous"
                },
                {
                    display_name: "Rendez-vous ID",
                    variable_name: "rdv_id",
                    value: rdvCree.id // L'ID réel du RDV généré par Supabase
                }
            ]
        },
        
        callback: function(response) {
            // --- CORRECTION SÉCURITÉ ---
            // On ne met pas à jour le RDV en JS. Le webhook s'en charge.
            btn.classList.replace('btn-primary', 'btn-success');
            btn.innerHTML = '<i class="fas fa-check-circle me-2"></i>Paiement initié !';
            
            // Notification SMS (Optionnelle)
            try {
                const medecinNom = document.getElementById('medecin-choisi-nom').textContent;
                const dateJolie = new Date(datetimeStr).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' }).replace(':', 'h');
                if (currentUser.phone && typeof envoyerSMSNotification === 'function') {
                    envoyerSMSNotification(currentUser.phone, dateJolie, medecinNom);
                }
            } catch (smsError) { console.error("Erreur SMS :", smsError); }

            setTimeout(() => { window.location.href = './dashboard.html'; }, 1500);
        },
        onClose: function() {
            alert('Paiement annulé. Le rendez-vous a été enregistré, vous pourrez le payer plus tard depuis votre tableau de bord.');
            window.location.href = './dashboard.html';
        }
    });

    handler.openIframe();
}