/* ═══════════════════════════════════════════════════════════
   CyberAtaraxia Training — BlueTeam
   Application Logic
   Author: Selim Jerbi — github.com/Selimjerbi66
   Repo:   github.com/Selimjerbi66/CyberAtaraxia-Training-Suite
═══════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════════════════
// PROFILE STATE
// ══════════════════════════════════════════════════════════
let PROFILE = null;
let SAVE_FILENAME = '';
let HAS_UNSAVED = false;

const LS_KEY = 'ca_blueteam_backup';

// ══════════════════════════════════════════════════════════
// AUTH PANEL SWITCHING
// ══════════════════════════════════════════════════════════
function showPanel(type) {
  document.getElementById('auth-options').style.display = 'none';
  document.getElementById('panel-new').style.display  = type === 'new'  ? 'block' : 'none';
  document.getElementById('panel-load').style.display = type === 'load' ? 'block' : 'none';
}

function hidePanel() {
  document.getElementById('auth-options').style.display = 'grid';
  document.getElementById('panel-new').style.display  = 'none';
  document.getElementById('panel-load').style.display = 'none';
  const e1 = document.getElementById('np-err');
  const e2 = document.getElementById('lp-err');
  if (e1) e1.style.display = 'none';
  if (e2) e2.style.display = 'none';
}

// ══════════════════════════════════════════════════════════
// CREATE NEW PROFILE
// ══════════════════════════════════════════════════════════
function createProfile() {
  const first  = document.getElementById('np-first').value.trim();
  const last   = document.getElementById('np-last').value.trim();
  const pseudo = document.getElementById('np-pseudo').value.trim();
  const job    = document.getElementById('np-job').value;
  const err    = document.getElementById('np-err');

  if (!first || !last || !pseudo || !job) {
    err.textContent = 'Please fill in all fields.';
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  PROFILE = {
    firstName:   first,
    lastName:    last,
    pseudo:      pseudo,
    occupation:  job,
    created:     new Date().toISOString(),
    lastSaved:   new Date().toISOString(),
    currentPage: 'dash',
    completed:   [],
    quizAnswers: {}
  };

  SAVE_FILENAME = pseudo.toLowerCase().replace(/[^a-z0-9_]/g, '_') + '_cyberataraxia.json';
  HAS_UNSAVED = false;

  // Save initial profile to localStorage immediately
  lsSave();

  // Download the initial JSON file
  downloadJSON();
  bootApp();
}

// ══════════════════════════════════════════════════════════
// LOAD PROFILE — drag/drop or file picker
// ══════════════════════════════════════════════════════════
let pendingFile = null;

function onFileSelect(e) {
  const f = e.target.files[0];
  if (f) setPendingFile(f);
}

function onDragOver(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.add('dragover');
}
function onDragLeave() {
  document.getElementById('drop-zone').classList.remove('dragover');
}
function onDrop(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.remove('dragover');
  const f = e.dataTransfer.files[0];
  if (f) setPendingFile(f);
}

function setPendingFile(f) {
  pendingFile = f;
  const nameEl = document.getElementById('dz-file-name');
  nameEl.textContent = '📄 ' + f.name;
  nameEl.style.display = 'block';
  document.getElementById('load-confirm-btn').style.display = 'block';
}

function loadProfile() {
  if (!pendingFile) return;
  const err = document.getElementById('lp-err');
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.pseudo || !data.firstName) throw new Error('Invalid profile file.');
      PROFILE = data;
      if (!PROFILE.completed)   PROFILE.completed   = [];
      if (!PROFILE.quizAnswers) PROFILE.quizAnswers  = {};
      if (!PROFILE.currentPage) PROFILE.currentPage  = 'dash';
      SAVE_FILENAME = pendingFile.name;
      HAS_UNSAVED = false;

      // Check if localStorage has a newer backup
      checkLocalStorageBackup();

      err.style.display = 'none';
      bootApp();
    } catch(ex) {
      err.textContent = 'Could not read file. Make sure it is a valid CyberAtaraxia .json save file.';
      err.style.display = 'block';
    }
  };
  reader.readAsText(pendingFile);
}

// ══════════════════════════════════════════════════════════
// LOCALSTORAGE AUTO-BACKUP
// ══════════════════════════════════════════════════════════
function lsSave() {
  if (!PROFILE) return;
  try {
    PROFILE.lsBackupTime = new Date().toISOString();
    localStorage.setItem(LS_KEY + '_' + PROFILE.pseudo, JSON.stringify(PROFILE));
  } catch(e) { /* quota exceeded — fail silently */ }
}

function lsLoad(pseudo) {
  try {
    const raw = localStorage.getItem(LS_KEY + '_' + pseudo);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function checkLocalStorageBackup() {
  if (!PROFILE) return;
  const backup = lsLoad(PROFILE.pseudo);
  if (!backup) return;

  const fileTime   = new Date(PROFILE.lastSaved  || 0).getTime();
  const backupTime = new Date(backup.lsBackupTime || 0).getTime();

  if (backupTime > fileTime) {
    // Backup is newer — offer to use it
    const msg =
      'A more recent auto-backup was found for "' + PROFILE.pseudo + '".\n\n' +
      'File save:    ' + (PROFILE.lastSaved  ? new Date(PROFILE.lastSaved).toLocaleString()  : 'unknown') + '\n' +
      'Auto-backup:  ' + new Date(backup.lsBackupTime).toLocaleString() + '\n\n' +
      'Load the auto-backup instead? (Recommended — it has your latest progress)';
    if (window.confirm(msg)) {
      PROFILE = backup;
      HAS_UNSAVED = true; // mark as unsaved since the file is outdated
    }
  }
}

// ══════════════════════════════════════════════════════════
// MARK UNSAVED CHANGES
// ══════════════════════════════════════════════════════════
function markDirty() {
  if (HAS_UNSAVED) return;
  HAS_UNSAVED = true;
  const btn  = document.getElementById('save-btn');
  const info = document.getElementById('save-info');
  if (btn) {
    btn.classList.add('dirty');
    btn.innerHTML = '<span class="unsaved-dot"></span>↓ Save progress';
  }
  if (info) info.textContent = 'Unsaved changes';
  // Auto-backup to localStorage every time something changes
  lsSave();
}

function markClean() {
  HAS_UNSAVED = false;
  const btn  = document.getElementById('save-btn');
  const info = document.getElementById('save-info');
  if (btn) {
    btn.classList.remove('dirty');
    btn.innerHTML = '<span>↓</span> Save progress';
    btn.classList.add('flash');
    setTimeout(() => btn.classList.remove('flash'), 1200);
  }
  const ts = new Date().toLocaleTimeString();
  if (info) info.textContent = '✓ Saved at ' + ts;
}

// ══════════════════════════════════════════════════════════
// SAVE PROFILE — re-download same filename
// ══════════════════════════════════════════════════════════
function saveProfile() {
  if (!PROFILE) return;
  PROFILE.lastSaved   = new Date().toISOString();
  PROFILE.currentPage = currentPage();
  lsSave();
  downloadJSON();
  markClean();
}

function downloadJSON() {
  const blob = new Blob([JSON.stringify(PROFILE, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = SAVE_FILENAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════
// BEFORE UNLOAD — warn if unsaved changes
// ══════════════════════════════════════════════════════════
window.addEventListener('beforeunload', function(e) {
  if (HAS_UNSAVED && PROFILE) {
    e.preventDefault();
    e.returnValue = 'You have unsaved progress. Download your save file before leaving.';
    return e.returnValue;
  }
});

// ══════════════════════════════════════════════════════════
// LOGO GRACEFUL FALLBACK
// ══════════════════════════════════════════════════════════
function initLogos() {
  document.querySelectorAll('img[data-logo]').forEach(img => {
    img.onerror = function() { this.classList.add('hidden'); };
  });
}

// ══════════════════════════════════════════════════════════
// BOOT APP
// ══════════════════════════════════════════════════════════
function bootApp() {
  document.getElementById('auth-scr').style.display = 'none';
  document.getElementById('app').classList.add('on');

  document.getElementById('hnm').textContent = PROFILE.pseudo;
  document.getElementById('hav').textContent = PROFILE.firstName[0].toUpperCase();

  // Restore quiz answers
  Object.entries(PROFILE.quizAnswers).forEach(([qid, ans]) => restoreQ(qid, ans.ci, ans.ri));

  // Restore completions
  PROFILE.completed.forEach(id => {
    const btn = document.getElementById('btn-' + id);
    const ub  = document.getElementById('ub-'  + id);
    if (btn) { btn.textContent = '✓ Module complete'; btn.classList.add('ds'); btn.disabled = true; }
    if (ub)  ub.style.display = '';
  });

  updateProg();
  renderGrid();
  renderRes('all');
  updateClock();
  setInterval(updateClock, 1000);

  // Update save info with last saved time
  const info = document.getElementById('save-info');
  if (info && PROFILE.lastSaved) {
    info.textContent = 'Last saved: ' + new Date(PROFILE.lastSaved).toLocaleString();
  }

  nav(PROFILE.currentPage || 'dash');
}

// ══════════════════════════════════════════════════════════
// CURRENT PAGE HELPER
// ══════════════════════════════════════════════════════════
function currentPage() {
  const active = document.querySelector('.page.active');
  return active ? active.id.replace('page-', '') : 'dash';
}

// ══════════════════════════════════════════════════════════
// MODULES LIST
// ══════════════════════════════════════════════════════════
const MODS = [
  {id:'secfund', name:'Security Fundamentals', sub:'CIA, controls, OSI model',    phase:0},
  {id:'net101',  name:'Networking 101',         sub:'Protocols, devices, TCP/IP',  phase:0},
  {id:'ad',      name:'Active Directory',        sub:'AD attacks, Kerberos',        phase:0},
  {id:'soc',     name:'SOC Architecture',        sub:'Tier roles, SIEM, SOAR, EDR', phase:1},
  {id:'mitre',   name:'MITRE ATT&CK',           sub:'14 tactics, Pyramid of Pain', phase:1},
  {id:'ti',      name:'Threat Intelligence',     sub:'IOCs, OSINT, MISP, PAP/TLP', phase:1},
  {id:'logs',    name:'Log Analysis',            sub:'Windows EIDs, Linux logs',   phase:1},
  {id:'alerts',  name:'Alert Management',        sub:'Triage, correlation',         phase:1},
  {id:'siem',    name:'SIEM & Queries',          sub:'SPL, KQL, Sigma, tuning',    phase:2},
  {id:'network', name:'Network Security',        sub:'Wireshark, PCAP, C2',        phase:2},
  {id:'ids',     name:'IDS: Snort & Suricata',   sub:'Rules, signatures, anomaly', phase:2},
  {id:'phishing',name:'Phishing Analysis',       sub:'Headers, VBA macros, BEC',   phase:3},
  {id:'malware', name:'Malware Analysis',        sub:'PE, imports, entropy',        phase:3},
  {id:'privesc', name:'Privilege Escalation',    sub:'UAC bypass, token, SAM',     phase:3},
  {id:'forensics',name:'Digital Forensics',      sub:'Artifacts, Autopsy, KAPE',   phase:4},
  {id:'timeline',name:'Timeline Analysis',       sub:'MACB, timestomping',         phase:4},
  {id:'memory',  name:'Memory Analysis',         sub:'Volatility 3, fileless',     phase:4},
  {id:'ir',      name:'Incident Response',       sub:'PICERL, evidence, TheHive',  phase:4},
  {id:'hunting', name:'Threat Hunting',          sub:'Hypothesis, IOC, LOLBins',   phase:4},
  {id:'cloud',   name:'Cloud Security',          sub:'CloudTrail, IAM, crypto',    phase:4},
  {id:'docs',    name:'Documentation',           sub:'Reports, playbooks',         phase:5},
];

// ══════════════════════════════════════════════════════════
// QUIZ ANSWERS DATABASE
// ══════════════════════════════════════════════════════════
const QANS = {
  'q-sf1':{c:2,exp:['Availability is the primary violation. Confidentiality concerns unauthorized access to data, not denial of access to legitimate users.','Integrity is also violated but the PRIMARY business impact is that users cannot access their data.','Correct. Ransomware primarily violates Availability — legitimate users cannot access their data. Integrity is also violated, but Availability is the principal CIA impact driving the business emergency.','Incorrect framing — Availability is clearly the primary impact, though Integrity is also violated.']},
  'q-n1':{c:2,exp:['Normal browsing generates varied ports to varied destinations — not sequential port increments on a single target.','A SYN flood DoS attacks ONE specific port with massive volume — not sequential port enumeration.','Correct. Sequential SYN to incrementally increasing ports with no SYN-ACK responses = TCP SYN port scan (e.g. Nmap -sS). Network reconnaissance (T1046) — the attacker is mapping open services.','C2 beaconing targets ONE specific port at regular intervals — not sequential port discovery.']},
  'q-ad1':{c:1,exp:['Pass-the-Hash shows as EID 4624 Type 3 successful logons — not mass TGS ticket requests.','Correct. Mass EID 4769 across many different SPNs from one workstation = Kerberoasting (T1558.003). The attacker collects service tickets to crack service account passwords offline.','DCSync = EID 4662 replication rights used — not bulk TGS requests.','Golden Ticket uses KRBTGT hash to forge TGTs, not request TGS tickets from the KDC.']},
  'q-soc1':{c:1,exp:['Never. Mimikatz in memory on a standard workstation with no authorized pentest is a confirmed true positive.','Correct. Mimikatz (T1003.001) on a Finance workstation with no pentest = clear true positive. Escalate immediately to Tier 2 with all available context.','Time-critical — credential theft means hashes can be used for lateral movement within minutes.','Never contact the user through normal channels — risks tipping off a potential insider threat.']},
  'q-m1':{c:1,exp:['T1059.001 covers PowerShell execution under Execution — not registry-based persistence.','Correct. T1547.001 (Registry Run Keys) under Persistence tactic. Writing to HKCU\\...\\Run ensures the malware executes every time the user logs in.','T1003.001 is LSASS memory dumping under Credential Access.','T1070.004 is File Deletion under Defense Evasion.']},
  'q-ti1':{c:1,exp:['Shodan is for scanning internet-facing infrastructure, not campaign correlation.','Correct. OTX "pulses" link IOCs to specific campaigns and threat actors, surfacing related IPs, domains, and hashes.','URLhaus focuses specifically on malicious download URLs.','MISP is for sharing intelligence — not the first step for campaign research.']},
  'q-l1':{c:1,exp:['Brute force targets ONE account with many passwords — here many different usernames are targeted.','Correct. One source IP, many different usernames, 1–2 failures per account = password spraying (T1110.003). The attacker stays under per-account lockout thresholds.','Pass-the-Hash shows as successful EID 4624 logons, not failures.','Credential stuffing typically comes from many IPs (botnet), not a single source IP.']},
  'q-al1':{c:1,exp:['Multiple correlated alerts on one host in 8 minutes are never coincidental.','Correct. Phishing → macro exec → cred dump → lateral movement = complete attack chain. Escalate immediately and begin containment procedures.','You have more than sufficient evidence. Every additional minute risks further compromise.','You need to scope and respond to the entire correlated chain, not just one alert.']},
  'q-si1':{c:1,exp:['Disabling a detection rule destroys coverage — never correct.','Correct. Targeted exclusion of the specific known-good source with documented reasoning is best practice. Preserves coverage for all other sources.','Raising threshold to 1000 would blind you to attacks that succeed before 1000 failures.','Excluding all internal IPs blinds you to insider threats and compromised internal machines.']},
  'q-nw1':{c:1,exp:['CDN uses consistent domain names — not base64-encoded subdomains.','Correct. Base64 subdomains + machine-regular 60s interval = DNS tunneling C2 (T1071.004). Data is encoded in DNS subdomains of an attacker-controlled domain.','DGA generates many pseudo-random domain names — it would not encode data in one controlled domain\'s subdomains.','Legitimate updates use documented domain names at irregular intervals.']},
  'q-id1':{c:1,exp:['Port scan alerts should never be automatically closed — may be the first indicator of a pre-attack recon phase.','Correct. First: check if authorized scanner. Correlate with firewall logs. Assess severity. Then decide FP vs escalate.','Blocking without investigation may block a legitimate authorized scanner.','A port scan alone does not warrant Tier 3 involvement.']},
  'q-ph1':{c:1,exp:['AutoOpen() does not create shortcuts — it executes arbitrary VBA code automatically on document open.','Correct. AutoOpen() fires immediately on open (no user interaction). Shell() runs a system command. -enc = base64-encoded obfuscated PowerShell. This is a macro dropper — malicious.','AutoOpen() runs WITHOUT any user click — it fires immediately on document open.','Legitimate installers do not use obfuscated Shell() calls.']},
  'q-ma1':{c:1,exp:['Legitimate Windows services have low entropy (5–6.5) and standard imports.','Correct. High entropy (7.9) = packed/encrypted code. CreateRemoteThread + WriteProcessMemory = process injection. Packed malware with injection capability — requires sandbox to unpack.','Network scanners use socket functions and have low code entropy.','High entropy is NOT normal for .NET binaries — it always indicates packing/obfuscation.']},
  'q-pe1':{c:1,exp:['Token manipulation uses DuplicateToken/ImpersonateLoggedOnUser API calls — not registry modification and fodhelper.','Correct. fodhelper.exe is a UAC auto-elevate binary. Attackers hijack HKCU\\Software\\Classes\\ms-settings. fodhelper executes the attacker\'s command at HIGH integrity with no UAC prompt. T1548.002.','Pass-the-Hash uses stolen NTLM hashes for network authentication.','DLL hijacking places a malicious DLL for a legitimate app to load — not a registry command key.']},
  'q-fo1':{c:1,exp:['EID 4688 requires audit policy enabled and does not persist after deletion or record multiple run timestamps.','Correct. Prefetch files (.pf) persist even after the binary is deleted and record the last 8 execution timestamps.','$MFT records file existence and MACB timestamps, not execution history.','Browser history records web access, not binary execution.']},
  'q-tl1':{c:1,exp:['$STANDARD_INFORMATION and $FILE_NAME should be consistent — discrepancy is a forensic red flag.','Correct. $STANDARD_INFORMATION is modifiable by user-space tools. $FILE_NAME is kernel-set and cannot be modified without special access. Mismatch = timestomping.','File copying updates both MFT attributes — they would both reflect the copy date.','A clock error affects all files consistently, not a discrepancy within one file\'s attributes.']},
  'q-me1':{c:1,exp:['pslist and psscan should find the same processes — discrepancy is not by design, it is a finding.','Correct. pslist walks PsActiveProcessList which rootkits can unlink from. psscan carves physical memory directly. 2 extra in psscan = active kernel-level hiding = rootkit indicator.','Both are valid methods. Discrepancy is a finding, not an error.','A corrupted dump causes widespread errors — not a precise 2-process discrepancy.']},
  'q-ir1':{c:1,exp:['Reimaging before scoping destroys forensic evidence and misses additional infected systems.','Correct. Short-term containment = network isolation. Stops spread and C2 communication while preserving volatile evidence.','Running AV without isolating means malware continues spreading during the entire scan.','Never notify users via email during an active incident — use out-of-band channels.']},
  'q-hu1':{c:1,exp:['Searching only last 24 hours misses all evidence of compromise since October 2023.','Correct. Enrichment first: understand the campaign context, confirm IOC reliability, determine the correct search window. Then run comprehensive queries.','SIEMs do not retroactively match new IOCs — you must query manually.','Management notification comes after investigation confirms impact and scope.']},
  'q-cl1':{c:1,exp:['Admin account creation from an unrecognized country is never a "wait and see" situation.','Correct. T1136 in cloud — compromised IAM user creating persistent admin backdoor. Escalate immediately.','Contacting the user risks alerting the attacker if credentials were stolen.','Foreign-country admin creation with no change ticket is never normal DevOps activity.']},
  'q-do1':{c:1,exp:['The issue is specificity, not audience — "improve security posture" is useless for any audience.','Correct. Not actionable — no specific action, owner, or timeline. Good recommendations: "Enforce MFA on all VPN by [date], assigned to IT Infrastructure team."','Recommendations are a mandatory section of every incident report.','A good recommendation needs enough specificity to be acted on — this one has none.']},
};

// ══════════════════════════════════════════════════════════
// QUIZ ENGINE
// ══════════════════════════════════════════════════════════
function QA(qid, ci, ri) {
  const bl   = document.getElementById(qid);        if (!bl) return;
  const btns = bl.querySelectorAll('.qo');
  const fb   = document.getElementById(qid + '-fb');
  const qa   = QANS[qid];                            if (!qa) return;
  btns.forEach(b => b.disabled = true);
  btns[ci].classList.add(ci === ri ? 'ok' : 'no');
  if (ci !== ri) btns[ri].classList.add('ok');
  fb.textContent   = qa.exp[ci];
  fb.className     = 'qfb ' + (ci === ri ? 'ok' : 'no');
  fb.style.display = 'block';
  const ub = document.getElementById('uq-' + qid);
  if (ub) ub.style.display = 'block';
  if (PROFILE) {
    PROFILE.quizAnswers[qid] = { ci, ri };
    markDirty();
    lsSave();
  }
}

function restoreQ(qid, ci, ri) {
  const bl   = document.getElementById(qid); if (!bl) return;
  const btns = bl.querySelectorAll('.qo');
  const fb   = document.getElementById(qid + '-fb');
  const qa   = QANS[qid];
  if (!qa || !btns.length) return;
  btns.forEach(b => b.disabled = true);
  btns[ci].classList.add(ci === ri ? 'ok' : 'no');
  if (ci !== ri) btns[ri].classList.add('ok');
  fb.textContent   = qa.exp[ci];
  fb.className     = 'qfb ' + (ci === ri ? 'ok' : 'no');
  fb.style.display = 'block';
  const ub = document.getElementById('uq-' + qid);
  if (ub) ub.style.display = 'block';
}

function UQ(qid) {
  const bl   = document.getElementById(qid); if (!bl) return;
  const btns = bl.querySelectorAll('.qo');
  const fb   = document.getElementById(qid + '-fb');
  btns.forEach(b => { b.disabled = false; b.classList.remove('ok', 'no'); });
  fb.style.display = 'none';
  fb.className     = 'qfb';
  const ub = document.getElementById('uq-' + qid);
  if (ub) ub.style.display = 'none';
  if (PROFILE) {
    delete PROFILE.quizAnswers[qid];
    markDirty();
    lsSave();
  }
}

// ══════════════════════════════════════════════════════════
// MODULE COMPLETE / UNMARK
// ══════════════════════════════════════════════════════════
function MC(id) {
  const btn = document.getElementById('btn-' + id);
  const ub  = document.getElementById('ub-'  + id);
  if (btn) { btn.textContent = '✓ Module complete'; btn.classList.add('ds'); btn.disabled = true; }
  if (ub)  ub.style.display = '';
  if (PROFILE && !PROFILE.completed.includes(id)) {
    PROFILE.completed.push(id);
    markDirty();
    lsSave();
  }
  updateProg(); renderGrid();
}

function UM(id) {
  const btn = document.getElementById('btn-' + id);
  const ub  = document.getElementById('ub-'  + id);
  if (btn) { btn.textContent = 'Mark module complete ✓'; btn.classList.remove('ds'); btn.disabled = false; }
  if (ub)  ub.style.display = 'none';
  if (PROFILE) {
    PROFILE.completed = PROFILE.completed.filter(x => x !== id);
    markDirty();
    lsSave();
  }
  updateProg(); renderGrid();
}

// ══════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════
function nav(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  const t = document.getElementById('page-' + page);
  if (t) { t.classList.add('active'); document.getElementById('mc').scrollTop = 0; }
  document.querySelectorAll('.ni').forEach(n => {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes("'" + page + "'"))
      n.classList.add('active');
  });
  if (PROFILE) {
    PROFILE.currentPage = page;
    lsSave();
  }
}

// ══════════════════════════════════════════════════════════
// PROGRESS
// ══════════════════════════════════════════════════════════
function getDone() { return PROFILE ? PROFILE.completed : []; }

function updateProg() {
  const done  = getDone();
  const total = MODS.length;
  const pct   = Math.round((done.length / total) * 100);
  const E  = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  const EW = (id, v) => { const e = document.getElementById(id); if (e) e.style.width   = v; };
  E('dd', done.length); E('dp', pct + '%');
  E('hpct', pct + '%');
  EW('hbar', pct + '%');
  const ph = ids => {
    const d = ids.filter(i => done.includes(i)).length;
    return Math.round((d / ids.length) * 100) + '%';
  };
  EW('ph0b', ph(['secfund','net101','ad']));
  EW('ph1b', ph(['soc','mitre','ti','logs','alerts']));
  EW('ph2b', ph(['siem','network','ids']));
  EW('ph3b', ph(['phishing','malware','privesc']));
  EW('ph4b', ph(['forensics','timeline','memory','ir','hunting','cloud']));
  EW('ph5b', ph(['docs']));

  const p0=['secfund','net101','ad'], p1=['soc','mitre','ti','logs','alerts'],
        p2=['siem','network','ids'], p3=['phishing','malware','privesc'],
        p4=['forensics','timeline','memory','ir','hunting','cloud'];
  let ph_ = 'Fundamentals', phs = 'Phase 0 of 5';
  if (p0.every(i=>done.includes(i)) && !p1.every(i=>done.includes(i))) { ph_='Detection & Intel';  phs='Phase 1 of 5'; }
  else if (p1.every(i=>done.includes(i)) && !p2.every(i=>done.includes(i))) { ph_='SIEM & Network';     phs='Phase 2 of 5'; }
  else if (p2.every(i=>done.includes(i)) && !p3.every(i=>done.includes(i))) { ph_='Endpoint & Malware'; phs='Phase 3 of 5'; }
  else if (p3.every(i=>done.includes(i)) && !p4.every(i=>done.includes(i))) { ph_='Investigation';      phs='Phase 4 of 5'; }
  else if (p4.every(i=>done.includes(i))) { ph_ = 'Exam Prep'; phs = 'Phase 5 of 5'; }
  E('dph', ph_); E('dphs', phs);

  MODS.forEach(m => {
    const nb = document.getElementById('nb-' + m.id);
    if (nb) { nb.textContent = done.includes(m.id) ? '✓' : '—'; nb.className = 'nb' + (done.includes(m.id) ? ' dn' : ''); }
  });
}

function renderGrid() {
  const g = document.getElementById('mgrid'); if (!g) return;
  const done = getDone();
  g.innerHTML = MODS.map(m => `
    <div class="mcd ${done.includes(m.id) ? 'comp' : ''}" onclick="nav('${m.id}')">
      <div class="mic">◈</div>
      <div class="mn">${m.name}</div>
      <div class="ms">${m.sub}</div>
      <div class="mf">
        <span class="mst ${done.includes(m.id) ? 'done' : 'todo'}">${done.includes(m.id) ? 'complete' : 'todo'}</span>
        <button class="mbtn">Open →</button>
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════════
// RESOURCES
// ══════════════════════════════════════════════════════════
const RES = [
  {n:'BTJA Free Course (Security Blue Team)',d:'Free course by the BTL1 exam creators.',u:'https://www.securityblue.team/courses/blue-team-junior-analyst-pathway-bundle',t:'course'},
  {n:'TryHackMe SOC Level 1 Path',d:'Structured path with hands-on labs.',u:'https://tryhackme.com/path/outline/soclevel1',t:'course'},
  {n:'Blue Team Labs Online (BTLO)',d:'Hands-on blue team challenges for BTL1.',u:'https://blueteamlabs.online/',t:'lab'},
  {n:'LetsDefend',d:'Free SOC analyst scenario practice.',u:'https://letsdefend.io',t:'lab'},
  {n:'Splunk BOTSV3 Dataset',d:'Boss of the SOC v3 CTF dataset for SPL practice.',u:'https://github.com/splunk/botsv3',t:'lab'},
  {n:'MemLabs — Volatility Challenges',d:'6 memory forensics CTF challenges.',u:'https://github.com/stuxnet999/MemLabs',t:'lab'},
  {n:'Malware Traffic Analysis (PCAPs)',d:'Real malware packet captures for Wireshark practice.',u:'https://malware-traffic-analysis.net',t:'lab'},
  {n:'flaws.cloud',d:'Browser-based AWS security challenge.',u:'http://flaws.cloud',t:'lab'},
  {n:'Awesome Splunk/Elastic Labs',d:'Curated SIEM practice labs.',u:'https://github.com/ChickenLoner/Awesome-Splunk-and-Elastic-SIEM-Practice-Labs',t:'lab'},
  {n:'HackerSploit Blue Team Series (Full Playlist)',d:'19 videos: Wireshark, Snort, Wazuh, Volatility and more.',u:'https://www.youtube.com/playlist?list=PLBf0hzazHTGNcIS_dHjM2NgNUFMW1EZFx',t:'video'},
  {n:'Ep.0: BTL Course Introduction',d:'Roles, tools, defender mindset.',u:'https://www.youtube.com/watch?v=Bt5fh3wQUAQ',t:'video'},
  {n:'Ep.1: Blue Team Operations Intro',d:'Defender lifecycle overview.',u:'https://www.youtube.com/watch?v=kkjsQV64r14',t:'video'},
  {n:'Ep.2: Wireshark for Blue Teams',d:'Defender-perspective Wireshark usage.',u:'https://www.youtube.com/watch?v=OjQ0gncwS7I',t:'video'},
  {n:'Ep.3: Installing & Configuring Wireshark',d:'Setup for live traffic analysis.',u:'https://www.youtube.com/watch?v=NwY57Wv0yfA',t:'video'},
  {n:'Ep.5: Wireshark Display & Capture Filters',d:'Master both Wireshark filter types.',u:'https://www.youtube.com/watch?v=-y_ObCrHB0g',t:'video'},
  {n:'Ep.6: Decrypting HTTPS With Wireshark',d:'TLS session key decryption.',u:'https://www.youtube.com/watch?v=a9eVf2uleaA',t:'video'},
  {n:'Ep.8: Introduction To Wazuh SIEM',d:'Open-source SIEM architecture and usage.',u:'https://www.youtube.com/watch?v=Hq58_yGJwHk',t:'video'},
  {n:'Ep.9: Installing & Configuring Wazuh',d:'Step-by-step Wazuh deployment.',u:'https://www.youtube.com/watch?v=SCG0wYGS-Mg',t:'video'},
  {n:'Ep.12: Intrusion Detection With Snort',d:'Hands-on Snort IDS usage.',u:'https://www.youtube.com/watch?v=Gh0sweT-G30',t:'video'},
  {n:'Ep.19: Memory Forensics With Volatility',d:'Volatility 3 hands-on walkthrough.',u:'https://www.youtube.com/watch?v=2S_pi9qnIo8',t:'video'},
  {n:'MITRE ATT&CK Navigator',d:'Official ATT&CK coverage visualization.',u:'https://mitre-attack.github.io/attack-navigator/',t:'tool'},
  {n:'VirusTotal',d:'Hash, IP, domain, URL threat analysis.',u:'https://www.virustotal.com',t:'tool'},
  {n:'Any.run Interactive Sandbox',d:'Free dynamic malware analysis.',u:'https://any.run',t:'tool'},
  {n:'AlienVault OTX',d:'Community TI and IOC enrichment.',u:'https://otx.alienvault.com',t:'tool'},
  {n:'abuse.ch (URLhaus, MalwareBazaar, ThreatFox)',d:'Malware samples, URLs, C2 feeds.',u:'https://abuse.ch',t:'tool'},
  {n:'Eric Zimmerman Tools',d:'Free forensics: MFTECmd, PECmd, AmcacheParser.',u:'https://ericzimmerman.github.io/',t:'tool'},
  {n:'REMnux Linux Distro',d:'Pre-loaded malware analysis environment.',u:'https://remnux.org',t:'tool'},
  {n:'Autopsy',d:'Free open-source disk forensics GUI.',u:'https://www.autopsy.com/',t:'tool'},
  {n:'PhishTool',d:'Phishing email triage platform.',u:'https://www.phishtool.com',t:'tool'},
  {n:'URLScan.io',d:'Safely scan and screenshot URLs.',u:'https://urlscan.io',t:'tool'},
  {n:'Windows Security Log Encyclopedia',d:'Every Windows Event ID explained.',u:'https://www.ultimatewindowssecurity.com/securitylog/encyclopedia/',t:'reference'},
  {n:'detection.fyi',d:'Detection use cases across SIEM platforms.',u:'https://detection.fyi',t:'reference'},
  {n:'Splunk Detection Research',d:'Official Splunk detection rules mapped to ATT&CK.',u:'https://research.splunk.com/detections/',t:'reference'},
  {n:'AD Security Blog (adsecurity.org)',d:"Sean Metcalf's AD attack and detection research.",u:'https://adsecurity.org',t:'reference'},
  {n:'Detect AD Attacks (0xmedhat)',d:'Detection guide for AD attacks.',u:'https://0xmedhat.gitbook.io/whoami/detect-ad-attacks',t:'reference'},
  {n:'LOLBAS Project',d:'Complete living-off-the-land binaries reference.',u:'https://lolbas-project.github.io',t:'reference'},
  {n:'NIST SP 800-61 IR Guide',d:'Official incident response guide. Free PDF.',u:'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf',t:'reference'},
  {n:'SigmaHQ — Sigma Rules Repository',d:'Community detection rules in Sigma format.',u:'https://github.com/SigmaHQ/sigma',t:'reference'},
  {n:'Splunk SPL Blog (zsec.uk)',d:'Practical SPL queries for SOC analysts.',u:'https://blog.zsec.uk/ltr-d101-splunk/',t:'reference'},
  {n:'MITRE CAR Analytics by Technique',d:'Detection analytics mapped to ATT&CK.',u:'https://car.mitre.org/analytics/by_technique',t:'reference'},
];

function fRes(type, btn) {
  document.querySelectorAll('.fb').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRes(type);
}

function renderRes(type) {
  const g = document.getElementById('rgrd'); if (!g) return;
  const f = type === 'all' ? RES : RES.filter(r => r.t === type);
  g.innerHTML = f.map(r => `
    <a class="rc" href="${r.u}" target="_blank">
      <div class="rctp">${r.t}</div>
      <div class="rcnm">${r.n}</div>
      <div class="rcd">${r.d}</div>
    </a>`).join('');
}

// ══════════════════════════════════════════════════════════
// CLOCK
// ══════════════════════════════════════════════════════════
function updateClock() {
  const e = document.getElementById('clock');
  if (e) e.textContent = new Date().toUTCString().slice(17, 25) + ' UTC';
}

// ══════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════
updateClock();
setInterval(updateClock, 1000);
initLogos();
