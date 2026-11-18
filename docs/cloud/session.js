// A short-lived opaque random token. No e-mail, no dummy address and no password in storage.
// sessionStorage intentionally does not survive a fully closed browser session.
const KEY='planner-web-v3-session';
export function saveSession(record){
 if(!record||!/^[a-f0-9]{64}$/.test(record.token)||!/^[a-z][a-z0-9_]{2,23}$/.test(record.username))throw Error('Ungültige Anmeldung');
 sessionStorage.setItem(KEY,JSON.stringify({token:record.token,username:record.username,user_id:record.user_id}));
}
export function readSession(){
 try {const o=JSON.parse(sessionStorage.getItem(KEY)||'null');return o&&/^[a-f0-9]{64}$/.test(o.token)?o:null;}catch{return null;}
}
export function clearSession(){sessionStorage.removeItem(KEY);}
