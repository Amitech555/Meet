// Lit le code à 6 chiffres envoyé à EMAIL dans Mailpit (Supabase local).
const list = json(http.get(`http://localhost:54324/api/v1/search?query=to:${EMAIL}`).body);
const msg = list.messages[0];
const full = json(http.get(`http://localhost:54324/api/v1/message/${msg.ID}`).body);
output.code = /\b(\d{6})\b/.exec(full.Text)[1];
