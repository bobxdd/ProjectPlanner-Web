import {configured, configError} from './client.js';
import {plannerRpc} from './rpc.js';
import {normalizeUsername,validateSignup,validateRecoveryCode,authErrorMessage,MIN_PASSWORD_LENGTH} from './auth-policy.mjs';
import {readSession,saveSession,clearSession} from './session.js';
const $=q=>document.querySelector(q);
const form=$('#auth-form'), submit=$('#submit'), name=$('#username'), password=$('#password'), confirmation=$('#confirm'), code=$('#recovery-code');
const notice=$('#notice'), tabs=[$('#tab-login'),$('#tab-signup')];
let mode='login',busy=false,client={rpc:plannerRpc};
const plannerUrl=new URL('./planner.html',location.href).href;
function tell(message,ok=false){notice.hidden=!message;notice.classList.toggle('ok',ok);notice.textContent=message||'';}
function setMode(next){mode=next;tell('');
 const signup=next==='signup',recover=next==='recover';
 $('#invite-label').hidden=!signup;$('#invite-code').required=signup;
 tabs.forEach(t=>{t.hidden=recover;t.classList.toggle('selected',t.id==='tab-'+next);t.disabled=busy;});
 $('#confirm-label').hidden=!signup&&!recover;confirmation.required=signup||recover;
 $('#recovery-label').hidden=!recover;code.required=recover;
 $('#password').autocomplete=signup||recover?'new-password':'current-password';
 $('#form-title').textContent=signup?'Einladung einlösen':recover?'Zugang wiederherstellen':'Willkommen zurück';
 $('#form-description').textContent=signup?'Nur mit persönlichem Einladungscode. Danach bewahre deinen einmaligen Wiederherstellungscode sicher auf.':recover?'Benutzername, Wiederherstellungscode und neues Passwort eingeben.':'Melde dich mit Benutzername und Passwort an.';
 submit.textContent=signup?'Konto erstellen':recover?'Passwort zurücksetzen':'Anmelden';
 $('#reset-link').hidden=next!=='login';
 $('#cancel-recovery').hidden=!recover;
 $('#recovery-instruction').hidden=!recover;
}
function busySet(on){busy=on;submit.disabled=on;tabs.forEach(t=>t.disabled=on);$('#reset-link').disabled=on;}
function showRecovery(result){
 // Never store the recovery code or send it to analytics / console.
 $('#recovery-output').hidden=false;
 $('#recovery-output-code').textContent=result.recovery_code;
 $('#recovery-output-message').textContent='Bewahre diesen Code außerhalb des Project Planners auf! Er wird nur einmal angezeigt und ist nötig, falls du dein Passwort vergisst.';
 const token=result.token;
 if(token){saveSession(result);}
 $('#enter-planner').hidden=!token;$('#return-login').hidden=Boolean(token);
 form.hidden=true;
 tabs.forEach(t=>t.hidden=true);
 $('#reset-link').hidden=true;
}
async function rpc(fn,args){const {data,error}=await client.rpc(fn,args);if(error)throw error;if(data?.error)throw Error(data.error);return data;}
async function init(){
 if(!configured){tell(configError);form.querySelectorAll('input,button').forEach(el=>el.disabled=true);tabs.forEach(t=>t.disabled=true);return;}
 const session=readSession();
 if(session){try{const result=await rpc('planner_whoami',{p_token:session.token});if(result?.id){location.replace(plannerUrl);return;}}catch{}
  clearSession();}
}
tabs[0].addEventListener('click',()=>{if(!busy)setMode('login')});
tabs[1].addEventListener('click',()=>{if(!busy)setMode('signup')});
$('#reset-link').addEventListener('click',()=>{if(!busy)setMode('recover')});
$('#cancel-recovery').addEventListener('click',()=>{if(!busy)setMode('login')});
$('#enter-planner').addEventListener('click',()=>location.replace(plannerUrl));
$('#return-login').addEventListener('click',()=>{form.hidden=false;$('#recovery-output').hidden=true;tabs.forEach(t=>t.hidden=false);setMode('login')});
$('#copy-recovery').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText($('#recovery-output-code').textContent);tell('Wiederherstellungscode kopiert.',true)}
 catch{tell('Kopieren nicht möglich. Bitte den Code manuell sichern.');}
});
form.addEventListener('submit',async e=>{e.preventDefault();if(busy||!client)return;
 const username=normalizeUsername(name.value),pw=password.value;
 if(mode==='signup'){const reason=validateSignup({username,password:pw,confirmation:confirmation.value});if(reason){tell(reason);return;}}
 if(mode==='recover' && (!validateRecoveryCode(code.value)||pw.length<MIN_PASSWORD_LENGTH||pw!==confirmation.value)){
  tell('Bitte 48-stelligen Wiederherstellungscode und übereinstimmendes neues Passwort (mindestens 12 Zeichen) eingeben.');return;
 }
 if(!username||!pw){tell('Bitte Benutzername und Passwort eingeben.');return;}
 busySet(true);tell('');
 try{
  if(mode==='signup'){const invite=$('#invite-code').value.trim().toLowerCase();if(!/^[a-f0-9]{48}$/.test(invite))throw Error('invitation_invalid');const result=await rpc('planner_register',{p_username:username,p_password:pw,p_invite_code:invite});$('#invite-code').value='';password.value='';confirmation.value='';showRecovery(result);return;}
  if(mode==='recover'){const result=await rpc('planner_recover',{p_username:username,p_recovery_code:code.value.trim().toLowerCase(),p_new_password:pw});password.value='';confirmation.value='';code.value='';showRecovery(result);return;}
  const result=await rpc('planner_login',{p_username:username,p_password:pw});password.value='';saveSession(result);location.replace(plannerUrl);
 }catch(error){tell(authErrorMessage(error))}finally{busySet(false)}
});
await init();
