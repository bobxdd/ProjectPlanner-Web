'use strict';
// Project Planner: compact delete confirmation anchored near the trash control.
// Cancellation has keyboard focus; destructive action is never preselected.
let deleteConfirmationActive=null;
function deleteConfirmPopover(message, anchor){
  if(deleteConfirmationActive)deleteConfirmationActive(false);
  return new Promise(resolve=>{
    const trigger=anchor?.getBoundingClientRect?.();
    const r=trigger&&trigger.width>=0?trigger:{left:Math.max(24,innerWidth-90),right:innerWidth-24,top:Math.max(70,innerHeight/2),bottom:Math.max(100,innerHeight/2+28),width:45,height:28};
    const parent=typeof modal!=='undefined'&&modal.open?modal:document.body;
    const el=document.createElement('section');
    el.className='delete-confirm-popover';el.setAttribute('role','alertdialog');el.setAttribute('aria-label','Löschen bestätigen');
    const title=document.createElement('h3');title.textContent='Löschen bestätigen';
    const detail=document.createElement('p');detail.textContent=message;
    const buttons=document.createElement('div');buttons.className='delete-confirm-actions';
    const cancel=document.createElement('button');cancel.type='button';cancel.className='btn mini';cancel.textContent='Abbrechen';
    const remove=document.createElement('button');remove.type='button';remove.className='btn mini danger';remove.textContent='Löschen';
    buttons.append(cancel,remove);el.append(title,detail,buttons);parent.append(el);
    let settled=false;
    const done=answer=>{
      if(settled)return;settled=true;
      el.remove();document.removeEventListener('pointerdown',outside,true);
      window.removeEventListener('resize',cancelOnMove,true);
      if(deleteConfirmationActive===done)deleteConfirmationActive=null;
      if(!answer&&anchor?.isConnected)anchor.focus?.({preventScroll:true});
      resolve(answer);
    };
    deleteConfirmationActive=done;
    const outside=event=>{if(!el.contains(event.target))done(false)};
    const cancelOnMove=()=>done(false);
    cancel.addEventListener('click',()=>done(false));remove.addEventListener('click',()=>done(true));
    document.addEventListener('pointerdown',outside,true);
    window.addEventListener('resize',cancelOnMove,true);
    const spacing=18,margin=12;
    // A backdrop-filtered <dialog> establishes a containing block for fixed
    // children. Viewport coordinates inside it were previously applied twice,
    // placing the popover outside the dialog and creating extra scrollbars.
    // Calculate in viewport coordinates, then convert to dialog-local values.
    const inDialog=parent===modal;
    if(inDialog)el.classList.add('inside-dialog');
    const bounds=inDialog?modal.getBoundingClientRect():{left:0,top:0,right:innerWidth,bottom:innerHeight,width:innerWidth,height:innerHeight};
    const width=Math.min(el.offsetWidth,Math.max(180,bounds.width-margin*2));
    const height=el.offsetHeight;
    const leftMin=bounds.left+margin,leftMax=Math.max(leftMin,bounds.right-margin-width);
    const topMin=bounds.top+margin,topMax=Math.max(topMin,bounds.bottom-margin-height);
    let left=Math.max(leftMin,Math.min(leftMax,r.left+r.width/2-width/2));
    let top=r.top-height-spacing;
    if(top<topMin){
      if(r.bottom+spacing+height<=bounds.bottom-margin)top=r.bottom+spacing;
      else {
        // Prefer a side placement if neither vertical direction fits.
        if(r.left-spacing-width>=leftMin)left=r.left-spacing-width;
        else if(r.right+spacing+width<=bounds.right-margin)left=r.right+spacing;
        top=r.top+r.height/2-height/2;
      }
    }
    top=Math.max(topMin,Math.min(topMax,top));
    // The dialog-local containing block must NOT receive viewport x/y values.
    el.style.left=(left-bounds.left)+'px';
    el.style.top=(top-bounds.top)+'px';
    el.style.visibility='visible';
    cancel.focus({preventScroll:true});
  });
}

// Installed before the legacy navigation handler, so Escape dismisses only the
// small confirmation, not the underlying editor.
document.addEventListener('keydown',e=>{if(deleteConfirmationActive&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();deleteConfirmationActive(false)}},true);
