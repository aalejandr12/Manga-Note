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
  const allSeries=await db.getAllSeries();
  console.log('--- Series list and variants ---');
  for(const s of allSeries){
    const orig = s.title || s.normalized_title || '';
    const n = normalize(orig);
    const v = gen(orig);
    console.log('ID',s.id,'title',JSON.stringify(orig),'normalized',n,'variants',v,'series_code',s.series_code);
  }
})();
