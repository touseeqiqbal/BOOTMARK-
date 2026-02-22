require('dotenv').config();
const { useFirestore, getCollectionRef } = require('../utils/db');

async function main(){
  const shareKey = '7010bf91ee751390';
  const formId = 'form-' + shareKey;
  if(useFirestore){
    console.log('Querying Firestore for submissions with formId', formId);
    const col = getCollectionRef('submissions');
    const q = col.where('formId', '==', formId).limit(50);
    const snap = await q.get();
    console.log('Found', snap.size, 'submissions');
    snap.forEach(doc => console.log(doc.id, doc.data()));
  } else {
    console.log('Firestore not enabled; check data/submissions.json');
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });
