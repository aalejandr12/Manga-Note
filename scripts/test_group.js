const Database=require('../server/database');
(async()=>{
  const db=new Database(); await db.ready;
  const normalize=(s='')=>s.replace(/\.pdf$/i,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const stripVolumeSuffix=(s='')=>s.replace(/(\b(?:vol(?:ume)?|v|cap(?:itulo|ítulo)?|chapter|ch)\b\s*[:.\-]?\s*\d+\s*$)/i,'').trim();
  const stripTrailingNumber=(s='')=>s.replace(/[\s\-\_]*(?:\(|\[)?\s*\d{1,4}\s*(?:\)|\])?\s*$/i,'').trim();
  const gen=(raw='')=>{const n=normalize(raw);const v1=stripVolumeSuffix(n);const v2=stripTrailingNumber(n);return Array.from(new Set([n,v1,v2].filter(Boolean)));};
  const incoming='The Demon King 2.pdf';
  const incomingVariants=gen(incoming);
  const incomingBase=stripTrailingNumber(normalize(incoming));
  console.log('incomingVariants',incomingVariants,'incomingBase',incomingBase);
  let found=false;
  const allSeries=await db.getAllSeries();
  // Primera pasada: exact match del título normalizado
  for(const s of allSeries){
    const originalNormalized = normalize(s.title || s.normalized_title || '');
    if(!originalNormalized) continue;
    if(originalNormalized === incomingBase){
      console.log('PREFER EXACT MATCH:',s.id,s.series_code,s.title);
      found=true;break;
    }
  }
  // Segunda pasada preferente: variantes que coincidan con la base
  if(!found){
    for(const s of allSeries){
      const cvs=gen(s.title||s.normalized_title||'');
      if(cvs.includes(incomingBase)){
        console.log('PREFER MATCH:',s.id,s.series_code,s.title);
        found=true;break;
      }
    }
  }
  if(!found){
    for(const s of allSeries){
      const cvs=gen(s.title||s.normalized_title||'');
      for(const iv of incomingVariants){
        for(const cv of cvs){
          if(iv===cv||iv.startsWith(cv)||cv.startsWith(iv)){
            console.log('FALLBACK MATCH:',s.id,s.series_code,s.title);
            found=true;break;
          }
        }
        if(found) break;
      }
      if(found) break;
    }
  }
  if(!found) console.log('NO MATCH');
  process.exit(0);
})();
