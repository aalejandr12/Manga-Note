// Script: detecta series similares por título y propone merges.
// Uso: node scripts/merge_similar_series.js [--apply]

const Database = require('../server/database');

function normalize(s=''){
  return s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

function extractBaseTitle(s=''){
  const cleanup = s.replace(/\.pdf$/i, '').toLowerCase().trim();
  return cleanup.replace(/(\b(vol(ume)?|v|cap(ítulo)?|chapter|ch)\b\s*\d+\s*$)/i, '').replace(/[^a-z0-9]+/g,' ').trim();
}

async function main(){
  const apply = process.argv.includes('--apply');
  const db = new Database(process.env.DB_PATH || './database/manga_library.db');
  await db.ready;

  const all = await db.getAllSeries();
  const byBase = {};
  for(const s of all){
    const base = extractBaseTitle(s.title || s.normalized_title || '');
    if(!base) continue;
    if(!byBase[base]) byBase[base]=[];
    byBase[base].push(s);
  }

  const candidates = [];
  // detect groups where base titles coincide (e.g., 'the demon king' and 'the demon king 2')
  for(const base in byBase){
    if(byBase[base].length>1){
      candidates.push(byBase[base]);
    }
  }

  if(candidates.length===0){
    console.log('No se detectaron series con títulos idénticos normalizados.');
    process.exit(0);
  }

  console.log('Series candidatas a merge:', candidates.length);
  for(const group of candidates){
    console.log('\n--- Grupo candidato ---');
    group.forEach(s=> console.log(`ID:${s.id} code:${s.series_code} title:${s.title}`));

    if(apply){
      // elegir primer elemento como destino
      const target = group[0];
      for(let i=1;i<group.length;i++){
        const src = group[i];
        console.log(`Aplicando merge: mover volúmenes de series ${src.id} -> ${target.id}`);
        // mover volumes
        await db._run('UPDATE volumes SET series_id = ? WHERE series_id = ?', [target.id, src.id]);
        // actualizar conteo
        const vols = await db.getVolumesBySeries(target.id);
        await db.updateSeriesVolCount(target.id, vols.length);
        // eliminar serie fuente
        await db._run('DELETE FROM series WHERE id = ?', [src.id]);
        db._save();
        console.log(`✅ Merge completado: ${src.id} -> ${target.id}`);
      }
    } else {
      console.log('Run with --apply to merge these groups.');
    }
  }
}

main().catch(e=>{ console.error(e); process.exit(2); });
