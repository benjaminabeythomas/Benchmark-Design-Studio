import './readability.css';
function refine(){
 document.querySelector('#undo')?.setAttribute('aria-label','Undo');
 document.querySelector('#redo')?.setAttribute('aria-label','Redo');
 const region=document.querySelector('#scene');
 if(region)new MutationObserver(()=>{const error=(region as HTMLElement).dataset.error;if(error){const loading=document.querySelector('.loading');if(loading)loading.textContent=error;}}).observe(region,{attributes:true,attributeFilter:['data-error']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refine,{once:true});else refine();
