'use strict';
// Protect edits in the desktop forms without interfering with their save flow.
// This guard only catches user-requested dismissal; successful saves can still
// call modal.close() normally.
(() => {
  const protectedForms = new Set([
    'task-form','project-form','category-form','stage-form','note-form',
    'status-form','widget-form'
  ]);
  let baseline = null;
  const warning = document.createElement('dialog');
  warning.id = 'unsaved-warning';
  warning.className = 'unsaved-warning';
  warning.setAttribute('aria-labelledby','unsaved-heading');
  warning.innerHTML = '<h2 id="unsaved-heading">Ungespeicherte Änderungen</h2>'+
    '<p>Du hast Änderungen vorgenommen, die noch nicht gespeichert wurden. Möchtest du weiter bearbeiten oder diese Änderungen verwerfen?</p>'+
    '<div class="unsaved-actions"><button type="button" class="btn" data-unsaved="keep">Weiter bearbeiten</button>'+
    '<button type="button" class="btn danger" data-unsaved="discard">Änderungen verwerfen</button></div>';
  document.body.append(warning);

  function snapshot() {
    const form = modal.querySelector('form');
    if (!form || !protectedForms.has(form.id)) return null;
    const elements = [...form.querySelectorAll('input,select,textarea')]
      .filter(el => !['button','submit','reset'].includes(el.type))
      .map(el => ({name:el.name || el.id || el.dataset.checkId || '',
        type:el.type,
        value:el.type === 'file' ? [...el.files].map(f=>[f.name,f.size,f.lastModified]) : el.value,
        checked:el.type === 'checkbox' || el.type === 'radio' ? el.checked : null}));
    return JSON.stringify({form:form.id,elements,checklist:form.id === 'task-form' ? draftChecklist : null});
  }
  function dirty() {return modal.open && baseline !== null && snapshot() !== baseline;}
  const originalDialog = dialog;
  dialog = function (...args) {originalDialog(...args);baseline = snapshot();};
  modal.addEventListener('close',()=>{
    // The close event is asynchronous; a new form may already be open.
    if(!modal.open) {baseline=null;if(warning.open)warning.close();}
  });
  function askBeforeDiscard() {
    if (!dirty()) return false;
    if (!warning.open) {
      warning.showModal();
      warning.querySelector('[data-unsaved="keep"]').focus({preventScroll:true});
    }
    return true;
  }
  warning.querySelector('[data-unsaved="keep"]').addEventListener('click',()=>warning.close());
  warning.querySelector('[data-unsaved="discard"]').addEventListener('click',()=>{
    warning.close();
    modal.close();
  });
  // Prevent the native Escape close and all older navigation handlers from
  // dismissing a dirty editor. Clean forms keep the original behavior.
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape') return;
    if(warning.open) {
      event.preventDefault();event.stopImmediatePropagation();
      warning.close(); // Escape dismisses only the warning, never the editor.
      return;
    }
    if(!modal.open) return;
    if(askBeforeDiscard()) {event.preventDefault();event.stopImmediatePropagation();}
  },true);
  modal.addEventListener('cancel',event=>{
    if(askBeforeDiscard()) event.preventDefault();
  });
  document.addEventListener('click',event=>{
    if(!modal.open || warning.open) return;
    const close = event.target.closest?.('[data-action="close-modal"]');
    const backdrop = event.target===modal;
    if((close && modal.contains(close)) || backdrop) {
      if(askBeforeDiscard()){event.preventDefault();event.stopImmediatePropagation();}
    }
  },true);
  // Used in targeted regression tests only for visibility of guard state.
  window.projectPlannerUnsavedGuard = Object.freeze({isDirty:dirty});
})();
