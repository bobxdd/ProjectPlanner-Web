// No passwords, raw recovery codes or session secrets are stored in this module.
export const MIN_PASSWORD_LENGTH=12;
export const MAX_PASSWORD_LENGTH=72;
export const USERNAME_PATTERN=/^[a-z][a-z0-9_]{2,23}$/;
export function normalizeUsername(value){return String(value ?? '').trim().toLowerCase();}
export function validateSignup({username,password,confirmation}){
 const u=normalizeUsername(username);
 if(!USERNAME_PATTERN.test(u))return 'Benutzername: 3–24 Zeichen, beginnt mit einem Buchstaben, danach nur a–z, 0–9 und _.';
 if(String(password??'').length<MIN_PASSWORD_LENGTH||new TextEncoder().encode(String(password)).byteLength>MAX_PASSWORD_LENGTH)return 'Bitte verwende mindestens 12 Zeichen und höchstens 72 UTF-8-Bytes.';
 if(password!==confirmation)return 'Die beiden Passwörter stimmen nicht überein.';
 return '';
}
export function validateRecoveryCode(code){return /^[a-f0-9]{48}$/i.test(String(code??'').trim());}
export function authErrorMessage(error){
 const msg=String(error?.message||error||'').toLowerCase();
 if(msg.includes('invitation_invalid'))return 'Dieser Einladungscode ist ungültig oder bereits verwendet.';
 if(msg.includes('registration_closed'))return 'Die beiden Plätze sind bereits vergeben. Weitere Konten sind ausgeschlossen.';
 if(msg.includes('username_taken')||msg.includes('duplicate key'))return 'Dieser Benutzername ist leider bereits vergeben.';
 if(msg.includes('username_invalid'))return 'Der Benutzername ist ungültig.';
 if(msg.includes('password_invalid'))return 'Das Passwort benötigt mindestens 12 Zeichen und höchstens 72 UTF-8-Bytes.';
 if(msg.includes('invalid_login'))return 'Benutzername oder Passwort ist falsch.';
 if(msg.includes('login_limited')||msg.includes('recovery_limited'))return 'Zu viele Versuche. Bitte versuche es in 15 Minuten wieder.';
 if(msg.includes('recovery_invalid'))return 'Benutzername oder Wiederherstellungscode ist falsch.';
 if(msg.includes('session_expired'))return 'Deine Anmeldung ist abgelaufen. Bitte melde dich neu an.';
 if(msg.includes('network')||msg.includes('failed to fetch'))return 'Keine Verbindung zum Anmeldedienst.';
 return 'Die Anmeldung konnte nicht abgeschlossen werden. Prüfe die Servereinrichtung und versuche es erneut.';
}
