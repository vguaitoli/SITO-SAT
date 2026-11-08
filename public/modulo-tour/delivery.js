/** Web3Forms public form keys select recipients; no recipient address is sent by the browser. */
export function formServiceAvailable(config) {
  const key = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return config?.recipientsVerified === true && key.test(config.primaryKey) && key.test(config.copyKey) && config.primaryKey !== config.copyKey;
}

export function notificationFields(data) {
  const yes = value => value ? 'Sì' : 'No';
  return {
    subject: 'Richiesta Via del Granito · ' + data.firstName + ' ' + data.lastName + ' · ' + data.requestId.slice(0, 8),
    from_name: 'Sardegna Trail Avventura · Modulo tour',
    email: data.email,
    replyto: data.email,
    riferimento: data.requestId,
    evento: 'La Via del Granito · 19–22 novembre 2026',
    quota: '500 € a persona · Last minute',
    nome: data.firstName,
    cognome: data.lastName,
    telefono: data.phone,
    tipologia_mezzo: data.vehicleType,
    marca_modello: data.vehicle,
    partecipanti_totali: data.people,
    altri_partecipanti: data.participants.map((person, index) => (index + 2) + '. ' + person.name + ' · ' + person.vehicle).join('\n') || 'Nessuno',
    camera_singola: yes(data.singleRoom) + (data.singleRoom ? ' · +30 € a notte' : ''),
    trasporto_bagagli: yes(data.luggage) + (data.luggage ? ' · Prezzo da concordare in base alle adesioni' : ''),
    assicurazione_personale: yes(data.insurance) + (data.insurance ? ' · +70 € a persona' : ''),
    ambito_preferenze: 'Preferenze per il partecipante principale. Altre esigenze nelle note.',
    note: data.notes || 'Nessuna',
    privacy: data.privacy ? 'Presa visione informativa del sito per la gestione della richiesta' : 'Non accettata',
    inviata_il: new Date().toISOString(),
    stato: 'Richiesta da verificare. Nessuna conferma di posto o pagamento.',
    botcheck: data.website ? true : false,
  };
}

export async function deliverRequest(config, data, state = {}, transport = fetch) {
  if (!formServiceAvailable(config)) throw new Error('Servizio non configurato.');
  if (!data.privacy || data.website) throw new Error('Richiesta non valida.');
  const fields = notificationFields(data);
  const next = { primary: state.primary || 'pending', copy: state.copy || 'pending' };
  for (const [slot, accessKey] of [['primary', config.primaryKey], ['copy', config.copyKey]]) {
    if (next[slot] === 'accepted') continue;
    // Do not automatically repeat an ambiguous delivery: the provider might have accepted it.
    if (next[slot] === 'unknown') return next;
    let response;
    let result;
    try {
      response = await transport('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...fields, access_key: accessKey, tipo_notifica: slot === 'primary' ? 'Richiesta STA' : 'Copia interna della richiesta' }),
        signal: AbortSignal.timeout(20000),
      });
      result = await response.json();
    } catch {
      next[slot] = 'unknown';
      return next;
    }
    if (response.ok && result.success === true) next[slot] = 'accepted';
    else {
      // Explicit provider rejection is safe to retry; a 5xx can be ambiguous.
      next[slot] = response.status >= 500 || (response.ok && typeof result.success !== 'boolean') ? 'unknown' : 'failed';
      return next;
    }
  }
  return next;
}
