// Browser RPC transport. Database SECURITY DEFINER functions stay server-only.
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.js';
const ACTIONS=new Set([
 'planner_register','planner_login','planner_recover','planner_whoami',
 'planner_logout','planner_change_password','planner_state_get',
 'planner_state_init','planner_state_put'
]);
export async function plannerRpc(action,params={}){
 if(!ACTIONS.has(action))return {data:null,error:{message:'operation_forbidden'}};
 try{
  const res=await fetch(SUPABASE_URL.replace(/\/$/,'')+'/functions/v1/planner-auth',{
   method:'POST',headers:{'content-type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY},
   cache:'no-store',body:JSON.stringify({action,params})
  });
  const body=await res.json();
  if(!res.ok||body.error)return {data:null,error:{message:body.error||'auth_unavailable'}};
  return {data:body.data??null,error:null};
 }catch{return {data:null,error:{message:'network_error'}};}
}
