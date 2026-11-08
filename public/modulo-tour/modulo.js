import { deliverRequest, formServiceAvailable } from './delivery.js';
const form = document.querySelector('#request-form');
const submit = document.querySelector('#submit');
const error = document.querySelector('#error');
const status = document.querySelector('#service-status');
const people = document.querySelector('#people');
const extras = document.querySelector('#additional-people');
const participantDrafts = new Map();
let requestId = crypto.randomUUID();
let sending = false;
let config;
let deliveryState = {};
function renderPeople() {
  for (const input of extras.querySelectorAll('input')) participantDrafts.set(input.name, input.value);
  extras.replaceChildren();
  for (let index = 1; index < Number(people.value); index++) {
    const section = document.createElement('section'); section.className = 'additional-person';
    const h3 = document.createElement('h3'); h3.textContent = 'Partecipante ' + (index + 1);
    const fields = document.createElement('div'); fields.className = 'fields';
    for (const [field, title] of [['name', 'Nome e cognome'], ['vehicle', 'Marca e modello del mezzo']]) {
      const label = document.createElement('label'); label.textContent = title;
      const input = document.createElement('input');
      input.name = 'participant_' + index + '_' + field;
      input.required = true; input.maxLength = 100;
      input.value = participantDrafts.get(input.name) || ''; input.autocomplete = 'off';
      label.append(input); fields.append(label);
    }
    section.append(h3, fields); extras.append(section);
  }
}
people.addEventListener('change', renderPeople);
function payload() {
  const data = new FormData(form);
  return {
    eventId: 'la-via-del-granito-2026', requestId,
    firstName: data.get('firstName'), lastName: data.get('lastName'),
    email: data.get('email'), phone: data.get('phone'),
    vehicleType: data.get('vehicleType'), vehicle: data.get('vehicle'),
    people: Number(data.get('people')),
    participants: Array.from({ length: Number(data.get('people')) - 1 }, (_, i) => ({
      name: data.get('participant_' + (i + 1) + '_name'), vehicle: data.get('participant_' + (i + 1) + '_vehicle'),
    })),
    singleRoom: data.has('singleRoom'), luggage: data.has('luggage'), insurance: data.has('insurance'),
    notes: data.get('notes'), privacy: data.has('privacy'), website: data.get('website'),
  };
}
form.addEventListener('input', () => { if (!sending) { requestId = crypto.randomUUID(); deliveryState = {}; } });
async function checkService() {
  try {
    const response = await fetch('/modulo-tour/config.json', { cache: 'no-store', headers: { Accept: 'application/json' } });
    config = await response.json();
    if (!response.ok || !formServiceAvailable(config)) throw new Error();
    status.textContent = 'Il modulo invia una richiesta a STA. La disponibilità del posto sarà confermata successivamente.';
    submit.disabled = false;
  } catch {
    status.textContent = 'Il servizio di invio non è ancora attivo. Puoi consultare il modulo, ma nessuna richiesta verrà trasmessa.';
  }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending || submit.disabled || !form.reportValidity()) return;
  sending = true; submit.disabled = true; error.hidden = true; submit.textContent = 'Invio in corso…';
  const values = payload();
  for (const field of form.elements) field.disabled = true;
  try {
    deliveryState = await deliverRequest(config, values, deliveryState);
    if (deliveryState.primary !== 'accepted') {
      if (deliveryState.primary === 'unknown') {
        error.textContent = 'Non possiamo verificare l’esito dell’invio. Per evitare doppioni, contatta STA e indica questo riferimento: ' + requestId;
        error.hidden = false;
        status.textContent = 'Invio da verificare con STA. Non inviare di nuovo lo stesso modulo.';
        return;
      }
      throw new Error('La richiesta non è stata accettata. Riprova senza chiudere la pagina.');
    }
    form.hidden = true;
    document.querySelector('#request-reference').textContent = 'Riferimento: ' + requestId;
    document.querySelector('#copy-status').textContent = deliveryState.copy === 'accepted'
      ? ''
      : 'La richiesta principale è stata ricevuta dal servizio di invio. La copia interna non è stata completata: non occorre ripetere la richiesta.';
    const success = document.querySelector('#success');
    success.hidden = false; success.focus(); success.scrollIntoView({ block: 'center' });
  } catch (failure) {
    error.textContent = failure.message || 'Invio non riuscito. Riprova.';
    error.hidden = false; error.scrollIntoView({ block: 'nearest' });
  } finally {
    sending = false;
    for (const field of form.elements) field.disabled = false;
    if (deliveryState.primary === 'unknown') submit.disabled = true;
    submit.textContent = 'Invia richiesta di partecipazione';
  }
});
checkService();
