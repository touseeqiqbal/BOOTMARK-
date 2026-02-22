const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const axios = require('axios');
const { useFirestore, getCollectionRef, setDoc } = require('../utils/db');

async function ensureLocalDataDir(){
  const dir = path.join(__dirname, '..', 'data');
  try{ await fs.mkdir(dir, {recursive:true}) }catch(e){}
}

async function addFormLocal(form){
  const formsPath = path.join(__dirname, '..', 'data', 'forms.json');
  try{
    let data = '[]';
    try{ data = await fs.readFile(formsPath, 'utf8') }catch(e){}
    let arr = [];
    try{ arr = JSON.parse(data) }catch(e){ arr = [] }
    arr.push(form);
    await fs.writeFile(formsPath, JSON.stringify(arr, null, 2), 'utf8');
    console.log('Wrote form to', formsPath);
  }catch(e){ console.error('Failed write local form', e) }
}

async function addSubmissionLocal(sub){
  const subsPath = path.join(__dirname, '..', 'data', 'submissions.json');
  try{
    let data = '[]';
    try{ data = await fs.readFile(subsPath, 'utf8') }catch(e){}
    let arr = [];
    try{ arr = JSON.parse(data) }catch(e){ arr = [] }
    arr.push(sub);
    await fs.writeFile(subsPath, JSON.stringify(arr, null, 2), 'utf8');
    console.log('Wrote submission to', subsPath);
  }catch(e){ console.error('Failed write local submission', e) }
}

async function main(){
  await ensureLocalDataDir();
  const shareKey = '7010bf91ee751390';
  const id = 'form-' + shareKey;
  const now = new Date().toISOString();
  const form = {
    id,
    userId: 'test-user',
    title: 'Test Form for submit flow',
    fields: [],
    settings: { confirmationMessage: 'Thanks!' },
    shareKey,
    createdAt: now,
    updatedAt: now
  };

  if(useFirestore){
    console.log('Adding form to Firestore...');
    await setDoc('forms', id, form);
    console.log('Form written to Firestore with id', id);
  } else {
    console.log('Adding form to local data...');
    await addFormLocal(form);
  }

  // Post submission
  const submission = {
    id: Date.now().toString(),
    formId: id,
    data: { test: 'hello' },
    submittedAt: new Date().toISOString(),
  };

  try{
    console.log('Posting submission to API...');
    const res = await axios.post(`http://localhost:4000/api/public/form/${shareKey}/submit`, { data: submission.data }, { timeout: 5000 });
    console.log('API response status', res.status, 'data:', res.data);
  }catch(e){
    if(e.response) console.error('API error', e.response.status, e.response.data);
    else console.error('API request failed', e.message);
  }

  // Check saved submission
  if(useFirestore){
    const snap = await getCollectionRef('submissions').doc(submission.id).get().catch(()=>null);
    if(snap && snap.exists) console.log('Submission in Firestore:', { id: snap.id, ...snap.data() });
    else console.log('No submission found in Firestore with id', submission.id);
  } else {
    const subsPath = path.join(__dirname, '..', 'data', 'submissions.json');
    try{
      const sdata = await fs.readFile(subsPath, 'utf8');
      const arr = JSON.parse(sdata || '[]');
      const found = arr.find(s=>s.id===submission.id);
      console.log('Local submissions count', arr.length);
      if(found) console.log('Found submission in local file:', found);
      else console.log('Submission not found locally (id)', submission.id);
    }catch(e){ console.error('Error reading local submissions', e.message) }
  }
}

main().catch(e=>{console.error('Script error', e && e.stack?e.stack:e); process.exit(1)})
