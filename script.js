(function(){

  const POSES = {
    walk_basket: "assets/walk_basket.png",
    walk_plain: "assets/walk_plain.png",
    jump: "assets/jump.png",
    flower_sniff: "assets/flower_sniff.png",
    startled: "assets/startled.png",
    joyful: "assets/joyful.png",
    wolf_standing: "assets/wolf_standing.png",
    grandma_surprised: "assets/grandma_surprised.png",
    grandma_door: "assets/grandma_door.png",
    wolf_angry: "assets/wolf_angry.png",
  };

  // apply default poses to every character/wolf sprite on load
  function setPose(imgEl, poseKey){ if(imgEl) imgEl.src = POSES[poseKey]; }
  ['charImg1','charImg2','charImg3','charImg4','charImg5','charImg6','charImg7','charImg8','charImg9'].forEach(id => setPose(document.getElementById(id), 'walk_basket'));
  setPose(document.getElementById('wolfImg'), 'wolf_standing');
  setPose(document.getElementById('wolfImg3'), 'wolf_standing');
  setPose(document.getElementById('wolfImg9'), 'wolf_angry');
  setPose(document.getElementById('grandmaImg9'), 'grandma_door');
  // ============================================================
  const chapters = [
    {id:1, label:"Home", state:"active"},
    {id:2, label:"Forest Path", state:"locked"},
    {id:3, label:"Meets Wolf", state:"locked"},
    {id:4, label:"Deep Forest", state:"locked"},
    {id:5, label:"Instructions", state:"locked"},
    {id:6, label:"Wolf's Trick", state:"locked"},
    {id:7, label:"To Grandma's", state:"locked"},
    {id:8, label:"Final Debug", state:"locked"},
    {id:9, label:"Ending", state:"locked"},
  ];

  let xp = 0;
  let totalXP = 0;
  let earnedAchievements = [];
  let currentChapter = 1; // 1-indexed, matches chapters[] array index+1
  let hintsUsed = 0;
  let hintIndex = 0;
  let solved = false;

  const trailEl = document.getElementById('trail');
  function renderTrail(){
    trailEl.innerHTML = '';
    chapters.forEach((c, i) => {
      const node = document.createElement('div');
      node.className = 'trail-node ' + c.state;
      node.innerHTML = `
        <div class="node-dot">${c.state==='complete' ? '✓' : c.state==='locked' ? '🔒' : (i+1)}</div>
        <div class="node-label">${c.label}</div>
        ${c.state==='locked' ? '<div class="locked-tip">Complete earlier chapters first</div>' : ''}
      `;
      trailEl.appendChild(node);
      if(i < chapters.length - 1){
        const line = document.createElement('div');
        line.className = 'trail-line';
        trailEl.appendChild(line);
      }
    });
  }
  renderTrail();

  function addXP(amount){
    totalXP += amount;
    xp = Math.min(100, xp + amount);
    document.getElementById('xpFill').style.width = xp + '%';
    document.getElementById('xpNum').textContent = xp;
  }

  function showToast(title, sub){
    if(!earnedAchievements.includes(title)) earnedAchievements.push(title);
    const t = document.getElementById('toast');
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastSub').textContent = sub;
    t.classList.add('show');
    setTimeout(()=> t.classList.remove('show'), 3600);
  }

  // ---------- code editor line numbers (shared) ----------
  const codeArea = document.getElementById('codeArea');
  const lineNums = document.getElementById('lineNums');
  function updateLineNums(){
    const lines = codeArea.value.split('\n').length;
    let out = '';
    for(let i=1;i<=lines;i++) out += i + '\n';
    lineNums.textContent = out;
  }
  codeArea.addEventListener('input', updateLineNums);
  codeArea.addEventListener('scroll', ()=>{ lineNums.style.transform = `translateY(-${codeArea.scrollTop}px)`; });

  // ---------- shared UI refs ----------
  const sceneWrap = document.getElementById('sceneWrap');
  const codePanel = document.getElementById('codePanel');
  const feedback = document.getElementById('feedback');
  const debugToggle = document.getElementById('debugToggle');
  const debugBody = document.getElementById('debugBody');
  const debugChevron = document.getElementById('debugChevron');
  const chapterEyebrow = document.getElementById('chapterEyebrow');
  const chapterTitleText = document.getElementById('chapterTitleText');
  const chapterDescText = document.getElementById('chapterDescText');
  let debugOpen = false;

  debugToggle.addEventListener('click', ()=>{
    debugOpen = !debugOpen;
    debugBody.classList.toggle('open', debugOpen);
    debugChevron.textContent = debugOpen ? '▴' : '▾';
  });

  function esc(s){
    return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  }
  function debugRow(label, val, ok){
    return `<div class="debug-row"><span>${esc(label)}</span><span class="${ok===undefined ? '' : (ok?'debug-ok':'debug-bad')}">${esc(val)}${ok===undefined?'':(ok?' ✓':' ✗')}</span></div>`;
  }
  function openDebug(){
    debugOpen = true;
    debugBody.classList.add('open');
    debugChevron.textContent = '▴';
  }
  function spawnParticles(){
    for(let i=0;i<18;i++){
      const p = document.createElement('div');
      p.className = 'particle';
      const size = 4 + Math.random()*6;
      p.style.width = size+'px'; p.style.height = size+'px';
      p.style.left = (45 + Math.random()*10) + '%';
      p.style.top = (55 + Math.random()*10) + '%';
      const dx = (Math.random()-0.5)*220;
      const dy = -100 - Math.random()*140;
      p.style.setProperty('--dx', dx+'px');
      p.style.setProperty('--dy', dy+'px');
      sceneWrap.appendChild(p);
      setTimeout(()=> p.remove(), 1000);
    }
  }

  // CHAPTER 1 — VARIABLES — Leaving Home
 
  const CH1_STARTER =
`# Grandma is expecting cookies and bread in that basket — not rocks!
# destination should be "Grandma's House", speed should feel like a
# normal walking pace (somewhere between 3 and 8), and she needs to
# be ready before she can leave.
basket_item = "rocks"
destination = "Wolf's Den"
speed = 1
is_ready = False`;

  const basketIcon = document.getElementById('basketIcon');
  const basketContents = document.getElementById('basketContents');
  const signBoard = document.getElementById('signBoard');
  const sceneCaption = document.getElementById('sceneCaption');
  const character = document.getElementById('character');

  function parseAssignments(code){
    const result = {};
    const lines = code.split('\n');
    for(const raw of lines){
      const line = raw.trim();
      if(!line || line.startsWith('#')) continue;
      const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
      if(!m) continue;
      const name = m[1];
      let val = m[2].trim();
      if(/^".*"$/.test(val) || /^'.*'$/.test(val)){
        result[name] = val.slice(1,-1);
      } else if(val === 'True'){
        result[name] = true;
      } else if(val === 'False'){
        result[name] = false;
      } else if(!isNaN(parseFloat(val))){
        result[name] = parseFloat(val);
      } else {
        result[name] = val;
      }
    }
    return result;
  }

  function applyVisualState1(state){
    const item = (state.basket_item || '').toLowerCase();
    const itemOK = item.includes('cookie') || item.includes('bread');
    basketContents.textContent = state.basket_item || '(empty)';
    basketIcon.textContent = itemOK ? '🍪' : '🪨';

    const dest = state.destination || '';
    const destOK = dest.toLowerCase().includes("grandma");
    signBoard.textContent = dest || '???';
    signBoard.className = 'board ' + (destOK ? 'right' : 'wrong');

    const speedOK = typeof state.speed === 'number' && state.speed >= 3 && state.speed <= 8;
    const readyOK = state.is_ready === true;

    return { itemOK, destOK, speedOK, readyOK };
  }

  const HINTS1 = [
    "Something about the basket doesn't seem right for a visit to Grandma\u2026",
    "Check where Little Red thinks she's going \u2014 that doesn't sound like Grandma's House.",
    "Her speed and readiness need a second look too \u2014 she can't leave until both make sense."
  ];

  function resetChapter1(){
    codeArea.value = CH1_STARTER;
    updateLineNums();
    codePanel.classList.remove('valid-glow');
    sceneWrap.classList.remove('broken-pulse');
    character.classList.remove('leaving');
    character.style.left = '16%';
    setPose(document.getElementById('charImg1'), 'walk_basket');
    applyVisualState1({basket_item:'rocks', destination:"Wolf's Den", speed:1, is_ready:false});
    sceneCaption.textContent = "Little Red is getting ready to leave home — but something isn't right yet.";
  }

  function runChapter1(){
    const rawCode = codeArea.value;
    const state = parseAssignments(rawCode);
    const checks = applyVisualState1(state);
    const allOK = checks.itemOK && checks.destOK && checks.speedOK && checks.readyOK;

    let html = '';
    html += debugRow('basket_item (parsed)', JSON.stringify(state.basket_item ?? '(missing)'), checks.itemOK);
    html += debugRow('destination (parsed)', JSON.stringify(state.destination ?? '(missing)'), checks.destOK);
    html += debugRow('speed (parsed)', JSON.stringify(state.speed ?? '(missing)') + '  [type: ' + typeof state.speed + ']', checks.speedOK);
    html += debugRow('is_ready (parsed)', JSON.stringify(state.is_ready ?? '(missing)') + '  [type: ' + typeof state.is_ready + ']', checks.readyOK);
    html += debugRow('ALL CHECKS PASS?', allOK ? 'YES' : 'NO', undefined);
    html += `<div class="debug-raw">Raw code Run just read:\n${esc(rawCode)}</div>`;
    debugBody.innerHTML = html;
    openDebug();

    if(allOK){
      solved = true;
      codePanel.classList.add('valid-glow');
      sceneWrap.classList.remove('broken-pulse');
      feedback.textContent = "✅ Everything checks out — Little Red is ready to go!";
      feedback.className = 'feedback show success';
      character.classList.add('walking');
      setPose(document.getElementById('charImg1'), 'joyful');
      spawnParticles();
      sceneCaption.textContent = "The basket is packed, the path is clear \u2014 time to enter the forest.";

      setTimeout(()=>{ character.classList.add('leaving'); }, 500);

      setTimeout(()=>{
        addXP(hintsUsed === 0 ? 60 : 40);
        showToast('First Bug Fixed', hintsUsed===0 ? '+60 XP · No hints used!' : '+40 XP');
        chapters[0].state = 'complete';
        chapters[1].state = 'active';
        renderTrail();
        switchToChapter(2);
      }, 2600);
    } else {
      sceneWrap.classList.add('broken-pulse');
      codePanel.classList.remove('valid-glow');
      let msg = "Something is still holding Little Red back. ";
      if(!checks.itemOK) msg += "The basket doesn't have the right things in it for Grandma. ";
      else if(!checks.destOK) msg += "She's not sure this path leads to Grandma's house. ";
      else if(!checks.readyOK) msg += "She doesn't feel ready to leave yet. ";
      else if(!checks.speedOK) msg += "Her pace feels off — too slow or too fast for the journey. ";
      feedback.textContent = "🔎 " + msg;
      feedback.className = 'feedback show';
    }
  }

  // CHAPTER 2 — CONDITIONS — The Forest Path
  const CH2_STARTER =
`# PSEUDOCODE:
# If it's sunny, the old bridge is safe to cross.
# Otherwise, take the meadow path to stay safe.
#
# Fill in the blank below to match the pseudocode.

weather = "stormy"

if weather == "____":
    take_path("bridge")
else:
    take_path("meadow")`;

  const sceneCaption2 = document.getElementById('sceneCaption2');
  const character2 = document.getElementById('character2');
  const labelMeadow = document.getElementById('labelMeadow');
  const labelBridge = document.getElementById('labelBridge');
  const meadowTrail = document.getElementById('meadowTrail');
  const bridgePlanks = document.getElementById('bridgePlanks');
  const meadowGlow = document.getElementById('meadowGlow');
  const bridgeGlow = document.getElementById('bridgeGlow');
  const blockMeadow = document.getElementById('blockMeadow');
  const blockBridge = document.getElementById('blockBridge');
  const stormEls = () => Array.from(document.querySelectorAll('#scene2 .sky-glow, #scene2 .hills-far, #scene2 .hills-mid, #scene2 .ground'));
  const cloudEls = () => Array.from(document.querySelectorAll('#scene2 .cloud'));

  // Only understands the exact template shape above — the "condition" test
  // is the point of this chapter, so parsing stays deliberately narrow.
  function parseChapter2(code){
    const lines = code.split('\n').map(l => l.trim());
    let weather = null, op = null, target = null, ifAction = null, elseAction = null;
    let mode = null;
    for(const line of lines){
      if(!line || line.startsWith('#')) continue;
      let m;
      if((m = line.match(/^weather\s*=\s*"([^"]*)"/))){ weather = m[1]; continue; }
      if((m = line.match(/^if\s+weather\s*(==|!=)\s*"([^"]*)"\s*:/))){ op = m[1]; target = m[2]; mode = 'if'; continue; }
      if(/^else\s*:/.test(line)){ mode = 'else'; continue; }
      if((m = line.match(/take_path\(\s*"([^"]*)"\s*\)/))){
        if(mode === 'if' && ifAction === null) ifAction = m[1];
        else if(mode === 'else' && elseAction === null) elseAction = m[1];
        continue;
      }
    }
    return { weather, op, target, ifAction, elseAction };
  }

  function evalChapter2(p){
    const filledIn = p.target !== null && p.target !== '____' && p.target !== '';
    let conditionTrue = null;
    if(p.weather != null && p.op && filledIn){
      conditionTrue = p.op === '==' ? (p.weather === p.target) : (p.weather !== p.target);
    }
    const takenPath = conditionTrue === true ? p.ifAction : (conditionTrue === false ? p.elseAction : null);
    const weatherMatchesScene = p.weather === 'stormy';
    const pathOK = weatherMatchesScene && takenPath === 'meadow';
    return { ...p, filledIn, conditionTrue, takenPath, weatherMatchesScene, pathOK };
  }

  function applyVisualState2(ev){
    [labelMeadow, labelBridge, meadowTrail, bridgePlanks].forEach(el => el.classList.remove('chosen','dimmed','path-dimmed'));
    meadowGlow.style.opacity = '0';
    bridgeGlow.style.opacity = '0';
    blockMeadow.classList.remove('show');
    blockBridge.classList.remove('show');

    if(ev.takenPath === 'meadow'){
      labelMeadow.classList.add('chosen');
      meadowGlow.style.opacity = '0.6';
      labelBridge.classList.add('dimmed'); bridgePlanks.classList.add('path-dimmed');
    } else if(ev.takenPath === 'bridge'){
      labelBridge.classList.add('chosen');
      bridgeGlow.style.opacity = '0.6';
      labelMeadow.classList.add('dimmed'); meadowTrail.classList.add('path-dimmed');
    }
  }

  function clearStorm(){
    stormEls().forEach(el => el.classList.remove('storm'));
    cloudEls().forEach(el => el.classList.add('clear'));
    document.getElementById('rainLayer').classList.add('clear');
    document.getElementById('lightningFlash').classList.add('clear');
  }

  const HINTS2 = [
    "Read the pseudocode comments carefully \u2014 what weather makes the bridge safe?",
    "The blank in the if-line needs to match that condition exactly \u2014 what should replace \"____\"?",
    "Right now it's stormy outside, so which branch of the if/else should actually run?"
  ];

  function resetChapter2(){
    codeArea.value = CH2_STARTER;
    updateLineNums();
    codePanel.classList.remove('valid-glow');
    sceneWrap.classList.remove('broken-pulse');
    [labelMeadow, labelBridge, meadowTrail, bridgePlanks].forEach(el => el.classList.remove('chosen','dimmed','path-dimmed'));
    meadowGlow.style.opacity = '0';
    bridgeGlow.style.opacity = '0';
    blockMeadow.classList.remove('show');
    blockBridge.classList.remove('show');
    stormEls().forEach(el => el.classList.add('storm'));
    cloudEls().forEach(el => el.classList.remove('clear'));
    document.getElementById('rainLayer').classList.remove('clear');
    document.getElementById('lightningFlash').classList.remove('clear');
    character2.classList.remove('walking','to-meadow','to-bridge','to-bridge-partial','shake');
    character2.style.left = '44%';
    setPose(document.getElementById('charImg2'), 'walk_basket');
    sceneCaption2.textContent = "The storm has made the old bridge dangerous — but the code doesn't seem to know that yet.";
  }

  function runChapter2(){
    const rawCode = codeArea.value;
    const parsed = parseChapter2(rawCode);
    const ev = evalChapter2(parsed);
    applyVisualState2(ev);
    character2.classList.remove('walking','to-meadow','to-bridge','to-bridge-partial','shake');

    let html = '';
    html += debugRow('weather (parsed)', JSON.stringify(ev.weather ?? '(missing)'), ev.weatherMatchesScene);
    html += debugRow('if-condition', 'weather ' + (ev.op ?? '?') + ' ' + JSON.stringify(ev.target ?? '(blank not filled in)'), ev.filledIn);
    html += debugRow('condition result', String(ev.conditionTrue), undefined);
    html += debugRow('path taken', ev.takenPath ?? '(none — check your if/else structure)', ev.pathOK);
    html += debugRow('ALL CHECKS PASS?', ev.pathOK ? 'YES' : 'NO', undefined);
    html += `<div class="debug-raw">Raw code Run just read:\n${esc(rawCode)}</div>`;
    debugBody.innerHTML = html;
    openDebug();

    if(ev.pathOK){
      solved = true;
      codePanel.classList.add('valid-glow');
      sceneWrap.classList.remove('broken-pulse');
      feedback.textContent = "✅ Smart thinking — the meadow path keeps her safe from the storm!";
      feedback.className = 'feedback show success';
      character2.classList.add('walking');
      setPose(document.getElementById('charImg2'), 'joyful');
      blockBridge.classList.add('show');
      spawnParticles();
      clearStorm();
      sceneCaption2.textContent = "As she confidently chooses the meadow, the storm finally breaks and the sky clears.";

      setTimeout(()=>{ character2.classList.add('to-meadow'); }, 500);

      setTimeout(()=>{
        addXP(hintsUsed === 0 ? 60 : 40);
        showToast('Condition Master', hintsUsed===0 ? '+60 XP · No hints used!' : '+40 XP');
        chapters[1].state = 'complete';
        chapters[2].state = 'active';
        renderTrail();
        switchToChapter(3);
      }, 2400);
    } else {
      sceneWrap.classList.add('broken-pulse');
      codePanel.classList.remove('valid-glow');
      let msg = "Something is still steering her wrong. ";
      if(!ev.filledIn) msg += "That blank in the if-line still needs to be filled in. ";
      else if(!ev.weatherMatchesScene) msg += "Take another look at the weather variable \u2014 it should match the storm you can see. ";
      else if(ev.takenPath === 'bridge') msg += "That condition is still sending her onto the unsafe bridge during the storm. ";
      else msg += "Check which path the condition actually leads to. ";
      feedback.textContent = "🔎 " + msg;
      feedback.className = 'feedback show';

      if(ev.takenPath === 'bridge'){
        character2.classList.remove('to-meadow');
        character2.classList.add('walking','to-bridge-partial');
        sceneCaption2.textContent = "She steps toward the old bridge\u2026 but it creaks dangerously in the storm.";
        setTimeout(()=>{
          character2.classList.remove('walking');
          character2.classList.add('shake');
          setPose(document.getElementById('charImg2'), 'startled');
        }, 1300);
        setTimeout(()=>{
          character2.classList.remove('shake','to-bridge-partial');
          setPose(document.getElementById('charImg2'), 'walk_basket');
          sceneCaption2.textContent = "That doesn't feel safe at all \u2014 the code still needs fixing.";
        }, 1900);
      } else if(ev.takenPath === 'meadow'){
        // weather variable itself was tampered with — walk her to the meadow but flag the mismatch
        character2.classList.remove('to-bridge','to-bridge-partial');
        character2.classList.add('walking','to-meadow');
        sceneCaption2.textContent = "She heads for the meadow \u2014 but the weather on screen still doesn't match the code.";
      }
    }
  }

  // CHAPTER 3 — LOOPS — Meeting the Wolf
  const CH3_STARTER =
`# HOW WHILE LOOPS WORK:
#   line = 0              <- starts a counter at 0
#   total_lines = 3        <- how many times to loop
#   while line < total_lines:  <- keeps looping while this is true
#       say_next_line()          <- runs this step each time
#       line = line + 1          <- moves the counter forward
#
# The wolf has three things to say before he'll let her pass.
line = 0
total_lines = 2

while line > total_lines:
    say_next_line()
    line = line + 1`;

  const WOLF_LINES = [
    "Well hello there, Little Red!",
    "Where are you headed on this fine day?",
    "You should pick some flowers for your Grandmother \u2014 she'd love that!"
  ];

  const sceneCaption3 = document.getElementById('sceneCaption3');
  const character3 = document.getElementById('character3');
  const wolfChar3 = document.getElementById('wolfChar3');
  const dialogueBubble3 = document.getElementById('dialogueBubble3');
  const lineCountText3 = document.getElementById('lineCountText3');
  let ch3Animating = false;

  // Recognizes the counter setup, the while condition, and the loop body.
  function parseChapter3(code){
    const lines = code.split('\n');
    let lineStart = null, totalLines = null;
    let condVar = null, condOp = null, condTarget = null;
    let hasCall = false, hasIncrement = false, inLoop = false;
    for(const raw of lines){
      const trimmed = raw.trim();
      if(!trimmed || trimmed.startsWith('#')) continue;
      let m;
      if(!inLoop && (m = trimmed.match(/^line\s*=\s*(\d+)\s*$/))){ lineStart = parseInt(m[1],10); continue; }
      if((m = trimmed.match(/^total_lines\s*=\s*(\d+)\s*$/))){ totalLines = parseInt(m[1],10); continue; }
      if((m = trimmed.match(/^while\s+(\w+)\s*(<|<=|>|>=)\s*(\w+)\s*:/))){
        condVar = m[1]; condOp = m[2]; condTarget = m[3]; inLoop = true; continue;
      }
      if(inLoop && /^say_next_line\(\)\s*$/.test(trimmed)){ hasCall = true; continue; }
      if(inLoop && (/^line\s*=\s*line\s*\+\s*1\s*$/.test(trimmed) || /^line\s*\+=\s*1\s*$/.test(trimmed))){
        hasIncrement = true; continue;
      }
    }
    return { lineStart, totalLines, condVar, condOp, condTarget, hasCall, hasIncrement };
  }

  function evalChapter3(p){
    const startOK = p.lineStart === 0;
    const condOK = p.condVar === 'line' && p.condTarget === 'total_lines' && (p.condOp === '<' || p.condOp === '<=');
    const structureOK = startOK && condOK && p.hasCall && p.hasIncrement;
    const countOK = p.totalLines === WOLF_LINES.length;
    const pathOK = structureOK && countOK;
    return { ...p, startOK, condOK, structureOK, countOK, pathOK };
  }

  function resetChapter3Scene(){
    character3.classList.remove('startled');
    wolfChar3.classList.remove('talking');
    dialogueBubble3.classList.remove('show');
    lineCountText3.textContent = '0 / ' + WOLF_LINES.length;
    setPose(document.getElementById('charImg3'), 'walk_basket');
  }

  const HINTS3 = [
    "Two things look off here \u2014 check both the while condition itself, and how many lines it's set to run.",
    "while line > total_lines: starting at 0, that condition is never even true. Which comparison would actually let the loop run?",
    "Fix the > to a < , and change total_lines to 3 so all of the wolf's lines get heard."
  ];

  function resetChapter3(){
    codeArea.value = CH3_STARTER;
    updateLineNums();
    codePanel.classList.remove('valid-glow');
    sceneWrap.classList.remove('broken-pulse');
    resetChapter3Scene();
    sceneCaption3.textContent = "A wolf steps out onto the path ahead — he looks like he has something to say.";
  }

  function runChapter3(){
    if(ch3Animating) return;
    const rawCode = codeArea.value;
    const parsed = parseChapter3(rawCode);
    const ev = evalChapter3(parsed);

    let html = '';
    html += debugRow('line (start)', ev.lineStart ?? '(missing)', ev.startOK);
    html += debugRow('while condition', (ev.condVar ?? '?') + ' ' + (ev.condOp ?? '?') + ' ' + (ev.condTarget ?? '?'), ev.condOK);
    html += debugRow('say_next_line() found', String(ev.hasCall), ev.hasCall);
    html += debugRow('counter increment found', String(ev.hasIncrement), ev.hasIncrement);
    html += debugRow('total_lines', ev.totalLines ?? '(missing)', ev.countOK);
    html += debugRow('ALL CHECKS PASS?', ev.pathOK ? 'YES' : 'NO', undefined);
    html += `<div class="debug-raw">Raw code Run just read:\n${esc(rawCode)}</div>`;
    debugBody.innerHTML = html;
    openDebug();

    if(!ev.structureOK){
      sceneWrap.classList.add('broken-pulse');
      codePanel.classList.remove('valid-glow');
      if(!ev.condOK) feedback.textContent = "🔎 That while condition doesn't look right \u2014 with line starting at 0, would it ever actually be true?";
      else feedback.textContent = "🔎 The while loop structure doesn't look complete yet \u2014 check the call and the counter update.";
      feedback.className = 'feedback show';
      return;
    }

    ch3Animating = true;
    resetChapter3Scene();
    codePanel.classList.remove('valid-glow');
    sceneWrap.classList.remove('broken-pulse');
    feedback.className = 'feedback';

    const linesToShow = Math.min(ev.totalLines, WOLF_LINES.length);
    let i = 0;

    function step(){
      if(i >= linesToShow){ finish(); return; }
      wolfChar3.classList.add('talking');
      dialogueBubble3.textContent = WOLF_LINES[i];
      dialogueBubble3.classList.add('show');
      setTimeout(()=>{
        wolfChar3.classList.remove('talking');
        i++;
        lineCountText3.textContent = i + ' / ' + WOLF_LINES.length;
        setTimeout(()=>{
          dialogueBubble3.classList.remove('show');
          setTimeout(step, 350);
        }, 2600);
      }, 500);
    }

    function finish(){
      ch3Animating = false;

      if(ev.pathOK){
        solved = true;
        codePanel.classList.add('valid-glow');
        feedback.textContent = "✅ She heard every line \u2014 including his suggestion to pick some flowers!";
        feedback.className = 'feedback show success';
        sceneCaption3.textContent = "\u201cWhat a good idea!\u201d Little Red heads off to gather flowers for Grandma.";
        setPose(document.getElementById('charImg3'), 'joyful');
        spawnParticles();

        setTimeout(()=>{
          addXP(hintsUsed === 0 ? 60 : 40);
          showToast('Patient Listener', hintsUsed===0 ? '+60 XP · No hints used!' : '+40 XP');
          chapters[2].state = 'complete';
          chapters[3].state = 'active';
          renderTrail();
          switchToChapter(4);
        }, 1600);
      } else {
        sceneWrap.classList.add('broken-pulse');
        let msg = "Something is still off. ";
        if(!ev.countOK && ev.totalLines < WOLF_LINES.length) msg += `The loop only ran ${ev.totalLines} time${ev.totalLines===1?'':'s'}, so she never heard his last line. `;
        else if(!ev.countOK) msg += "The loop ran more times than the wolf actually has lines to say. ";
        feedback.textContent = "🔎 " + msg;
        feedback.className = 'feedback show';
        sceneCaption3.textContent = ev.countOK ? "That went a bit long — he ran out of things to say." : "He trails off \u2014 he still had more to say.";
      }
    }

    step();
  }

  // CHAPTER 4 — LOOPS — The Endless Forest
  const CH4_STARTER =
`# Help Little Red collect every flower along this path.
# Count how many flowers you actually see, then fill in the blank.

for step in range(___):
    collect_flower()`;

  const TOTAL_FLOWERS = 5;
  const FLOWER_LEFTS = [12, 28, 44, 60, 76];

  const sceneCaption4 = document.getElementById('sceneCaption4');
  const character4 = document.getElementById('character4');
  const flowerCountText = document.getElementById('flowerCountText');
  const flowerEls = [0,1,2,3,4].map(i => document.getElementById('flower'+i));
  let ch4Animating = false;

  // Recognizes `for x in range(N):` and a `collect_flower()` call in the loop body.
  function parseChapter4(code){
    const lines = code.split('\n');
    let loopCount = null, hasCollectCall = false, inLoop = false;
    for(const raw of lines){
      const line = raw.trim();
      if(!line || line.startsWith('#')) continue;
      let m;
      if((m = line.match(/^for\s+\w+\s+in\s+range\(\s*([^)]*?)\s*\)\s*:/))){
        const inner = m[1].trim();
        loopCount = /^\d+$/.test(inner) ? parseInt(inner, 10) : null;
        inLoop = true; continue;
      }
      if(inLoop && /^collect_flower\(\)\s*$/.test(line)){ hasCollectCall = true; continue; }
    }
    return { loopCount, hasCollectCall };
  }

  function evalChapter4(p){
    const pathOK = p.hasCollectCall && p.loopCount === TOTAL_FLOWERS;
    return { ...p, pathOK };
  }

  function resetFlowers(){
    flowerEls.forEach(f => f.classList.remove('collected'));
    flowerCountText.textContent = '0 / ' + TOTAL_FLOWERS;
    character4.classList.remove('walking','confused');
    character4.style.left = '2%';
  }

  const HINTS4 = [
    "Count the flowers along the path \u2014 how many are actually out there?",
    "The number inside range( ) controls how many times the loop repeats \u2014 it needs to match that count.",
    "There are 5 flowers, so range(5) will make the loop repeat exactly enough times."
  ];

  function resetChapter4(){
    codeArea.value = CH4_STARTER;
    updateLineNums();
    codePanel.classList.remove('valid-glow');
    sceneWrap.classList.remove('broken-pulse');
    resetFlowers();
    setPose(document.getElementById('charImg4'), 'walk_basket');
    sceneCaption4.textContent = "Five flowers grow along this stretch of path — Grandma loves a full bouquet.";
  }

  function spawnSparkleAt(leftPercent){
    for(let i=0;i<10;i++){
      const p = document.createElement('div');
      p.className = 'particle';
      const size = 3 + Math.random()*4;
      p.style.width = size+'px'; p.style.height = size+'px';
      p.style.left = (leftPercent + (Math.random()*6-3)) + '%';
      p.style.top = (68 + Math.random()*6) + '%';
      const dx = (Math.random()-0.5)*90;
      const dy = -60 - Math.random()*60;
      p.style.setProperty('--dx', dx+'px');
      p.style.setProperty('--dy', dy+'px');
      sceneWrap.appendChild(p);
      setTimeout(()=> p.remove(), 1000);
    }
  }

  function runChapter4(){
    if(ch4Animating) return;
    const rawCode = codeArea.value;
    const parsed = parseChapter4(rawCode);
    const ev = evalChapter4(parsed);

    let html = '';
    html += debugRow('loop count parsed (range value)', ev.loopCount ?? '(missing)', ev.loopCount === TOTAL_FLOWERS);
    html += debugRow('collect_flower() call found', String(ev.hasCollectCall), ev.hasCollectCall);
    html += debugRow('flowers on the path', TOTAL_FLOWERS, undefined);
    html += debugRow('ALL CHECKS PASS?', ev.pathOK ? 'YES' : 'NO', undefined);
    html += `<div class="debug-raw">Raw code Run just read:\n${esc(rawCode)}</div>`;
    debugBody.innerHTML = html;
    openDebug();

    if(ev.loopCount === null || !ev.hasCollectCall){
      sceneWrap.classList.add('broken-pulse');
      codePanel.classList.remove('valid-glow');
      feedback.textContent = "🔎 The loop structure doesn't look complete yet \u2014 check the for line and the collect_flower() call.";
      feedback.className = 'feedback show';
      return;
    }

    ch4Animating = true;
    resetFlowers();
    codePanel.classList.remove('valid-glow');
    sceneWrap.classList.remove('broken-pulse');
    feedback.className = 'feedback';
    character4.classList.add('walking');

    const visits = Math.min(ev.loopCount, TOTAL_FLOWERS);
    const overshoot = ev.loopCount > TOTAL_FLOWERS;
    let i = 0;

    function step(){
      if(i < visits){
        character4.style.left = (FLOWER_LEFTS[i] - 2) + '%';
        setTimeout(()=>{
          flowerEls[i].classList.add('collected');
          spawnSparkleAt(FLOWER_LEFTS[i]);
          flowerCountText.textContent = (i+1) + ' / ' + TOTAL_FLOWERS;
          setPose(document.getElementById('charImg4'), 'flower_sniff');
          setTimeout(()=>{ setPose(document.getElementById('charImg4'), 'walk_basket'); }, 350);
          i++;
          setTimeout(step, 220);
        }, 480);
      } else if(overshoot){
        character4.style.left = '90%';
        setTimeout(()=>{
          character4.classList.remove('walking');
          character4.classList.add('confused');
          sceneCaption4.textContent = "She reaches past the last flower \u2014 there's nothing else out here.";
          setTimeout(finish, 700);
        }, 480);
      } else {
        finish();
      }
    }

    function finish(){
      character4.classList.remove('walking');
      ch4Animating = false;

      if(ev.pathOK){
        solved = true;
        codePanel.classList.add('valid-glow');
        feedback.textContent = "✅ All five flowers collected — a perfect bouquet for Grandma!";
        feedback.className = 'feedback show success';
        sceneCaption4.textContent = "The bouquet is complete. Time to keep moving through the forest.";
        setPose(document.getElementById('charImg4'), 'joyful');
        spawnParticles();

        setTimeout(()=>{
          addXP(hintsUsed === 0 ? 60 : 40);
          showToast('Loop Master', hintsUsed===0 ? '+60 XP · No hints used!' : '+40 XP');
          chapters[3].state = 'complete';
          chapters[4].state = 'active';
          renderTrail();
          switchToChapter(5);
        }, 1400);
      } else {
        sceneWrap.classList.add('broken-pulse');
        let msg = "Something is still off. ";
        if(ev.loopCount < TOTAL_FLOWERS) msg += `The loop only ran ${ev.loopCount} time${ev.loopCount===1?'':'s'}, so ${TOTAL_FLOWERS - ev.loopCount} flower${(TOTAL_FLOWERS-ev.loopCount)===1?'':'s'} got left behind. `;
        else msg += "The loop ran more times than there were flowers to collect. ";
        feedback.textContent = "🔎 " + msg;
        feedback.className = 'feedback show';
        if(!overshoot) sceneCaption4.textContent = "A few flowers are still waiting to be picked.";
      }
    }

    step();
  }

  // CHAPTER 5 — FUNCTIONS — Grandma's Special Instructions
  const CH5_STARTER =
`# HOW FUNCTIONS WORK:
#   def cross_log():   <- this DEFINES a new function named "cross_log"
#       jump()          <- indented lines are the steps INSIDE it
#   cross_log()         <- this CALLS the function, which runs those steps
#
# Defining a function doesn't run it by itself — it only runs
# once you actually call it, like on the last line below.
#
# Available actions (not all of these are useful here!):
#   move_forward()  -> takes one step forward
#   jump()          -> jumps over a gap
#   crawl()         -> crawls forward slowly
#   spin_around()   -> spins around in a circle
#   wave_hello()    -> waves at someone nearby
#   duck_down()     -> ducks under something low
#
# Grandma's note: to cross the log, move forward, THEN jump the
# gap, THEN move forward again to reach the other side.

def cross_log():
    # functions go here

cross_log()`;

  const EXPECTED_SEQUENCE = ['move_forward', 'jump', 'move_forward'];
  const STEP_LEFTS = [30, 55, 82];

  const sceneCaption5 = document.getElementById('sceneCaption5');
  const character5 = document.getElementById('character5');
  const gapBubble = document.getElementById('gapBubble');
  let ch5Animating = false;

  // Recognizes: `def NAME():`, indented calls inside its body, and a
  // top-level call to that same function afterward.
  function parseChapter5(code){
    const lines = code.split('\n');
    let funcName = null, calls = [], calledAfter = false, inFunc = false;
    for(const raw of lines){
      const trimmed = raw.trim();
      if(!trimmed || trimmed.startsWith('#')) continue;
      const indent = raw.match(/^(\s*)/)[1].length;
      let m;
      if((m = trimmed.match(/^def\s+(\w+)\s*\(\s*\)\s*:/))){
        funcName = m[1]; inFunc = true; continue;
      }
      if(inFunc){
        if(indent === 0){
          inFunc = false;
        } else {
          if((m = trimmed.match(/^(\w+)\(\)\s*$/))) calls.push(m[1]);
          continue;
        }
      }
      if(funcName && trimmed === funcName + '()'){ calledAfter = true; continue; }
    }
    return { funcName, calls, calledAfter };
  }

  function evalChapter5(p){
    const rightLength = p.calls.length === EXPECTED_SEQUENCE.length;
    const sequenceOK = rightLength && EXPECTED_SEQUENCE.every((a,i) => p.calls[i] === a);
    const pathOK = sequenceOK && p.calledAfter;
    return { ...p, rightLength, sequenceOK, pathOK };
  }

  function resetChapter5Scene(){
    character5.classList.remove('walking','jumping','hopping','falling');
    character5.style.left = '5%';
    gapBubble.classList.remove('show');
  }

  const HINTS5 = [
    "Read Grandma's note carefully \u2014 what order does she say the steps should happen in? Not every action listed above is actually useful here.",
    "You'll need three lines inside cross_log(): something to approach the gap, something to get over it, and something to land safely.",
    "Try: move_forward(), then jump(), then move_forward() again."
  ];

  function resetChapter5(){
    codeArea.value = CH5_STARTER;
    updateLineNums();
    codePanel.classList.remove('valid-glow');
    sceneWrap.classList.remove('broken-pulse');
    resetChapter5Scene();
    sceneCaption5.textContent = "Grandma left instructions for crossing this old log — but the steps look out of order.";
  }

  function showGapBubble(text){
    gapBubble.textContent = text;
    gapBubble.classList.add('show');
    setTimeout(()=> gapBubble.classList.remove('show'), 900);
  }

  function runChapter5(){
    if(ch5Animating) return;
    const rawCode = codeArea.value;
    const parsed = parseChapter5(rawCode);
    const ev = evalChapter5(parsed);

    let html = '';
    html += debugRow('function defined', ev.funcName ?? '(missing)', undefined);
    html += debugRow('steps found in order', ev.calls.length ? ev.calls.join(' \u2192 ') : '(none)', ev.rightLength);
    html += debugRow('matches expected order', EXPECTED_SEQUENCE.join(' \u2192 '), ev.sequenceOK);
    html += debugRow('function actually called', String(ev.calledAfter), ev.calledAfter);
    html += debugRow('ALL CHECKS PASS?', ev.pathOK ? 'YES' : 'NO', undefined);
    html += `<div class="debug-raw">Raw code Run just read:\n${esc(rawCode)}</div>`;
    debugBody.innerHTML = html;
    openDebug();

    if(!ev.funcName || !ev.rightLength){
      sceneWrap.classList.add('broken-pulse');
      codePanel.classList.remove('valid-glow');
      feedback.textContent = "🔎 cross_log() needs exactly three steps inside it \u2014 check the function body.";
      feedback.className = 'feedback show';
      return;
    }
    if(!ev.calledAfter){
      sceneWrap.classList.add('broken-pulse');
      codePanel.classList.remove('valid-glow');
      feedback.textContent = "🔎 Defining cross_log() isn't enough \u2014 it also needs to actually be called.";
      feedback.className = 'feedback show';
      return;
    }

    ch5Animating = true;
    resetChapter5Scene();
    codePanel.classList.remove('valid-glow');
    sceneWrap.classList.remove('broken-pulse');
    feedback.className = 'feedback';

    let i = 0;
    function step(){
      if(i >= EXPECTED_SEQUENCE.length){ finish(); return; }
      const expected = EXPECTED_SEQUENCE[i];
      const actual = ev.calls[i];
      character5.style.left = STEP_LEFTS[i] + '%';

      if(actual === expected){
        character5.classList.add(actual === 'jump' ? 'jumping' : 'walking');
        setPose(document.getElementById('charImg5'), actual === 'jump' ? 'jump' : 'walk_basket');
        setTimeout(()=>{
          character5.classList.remove('walking','jumping');
          setPose(document.getElementById('charImg5'), 'walk_basket');
          i++; setTimeout(step, 150);
        }, 620);
      } else if(expected === 'jump' && actual === 'move_forward'){
        character5.classList.add('falling');
        setPose(document.getElementById('charImg5'), 'startled');
        showGapBubble("There's a gap here \u2014 she needs to jump!");
        setTimeout(()=>{
          character5.classList.remove('falling');
          setPose(document.getElementById('charImg5'), 'walk_basket');
          i++; setTimeout(step, 400);
        }, 650);
      } else if(expected === 'move_forward' && actual === 'jump'){
        character5.classList.add('hopping');
        setPose(document.getElementById('charImg5'), 'jump');
        showGapBubble("That's a jump with nowhere to land yet.");
        setTimeout(()=>{
          character5.classList.remove('hopping');
          setPose(document.getElementById('charImg5'), 'walk_basket');
          i++; setTimeout(step, 300);
        }, 550);
      } else {
        character5.classList.add('walking');
        setTimeout(()=>{
          character5.classList.remove('walking');
          i++; setTimeout(step, 200);
        }, 500);
      }
    }

    function finish(){
      ch5Animating = false;

      if(ev.pathOK){
        solved = true;
        codePanel.classList.add('valid-glow');
        feedback.textContent = "✅ Perfect crossing — the steps ran in exactly the right order!";
        feedback.className = 'feedback show success';
        sceneCaption5.textContent = "With cross_log() working, she's safely on the other side.";
        setPose(document.getElementById('charImg5'), 'joyful');
        spawnParticles();

        setTimeout(()=>{
          addXP(hintsUsed === 0 ? 60 : 40);
          showToast('Function Builder', hintsUsed===0 ? '+60 XP · No hints used!' : '+40 XP');
          chapters[4].state = 'complete';
          chapters[5].state = 'active';
          renderTrail();
          switchToChapter(6);
        }, 1200);
      } else {
        sceneWrap.classList.add('broken-pulse');
        let msg = "Something is still out of order. ";
        if(!ev.sequenceOK) msg += `cross_log() runs ${ev.calls.join(' \u2192 ')}, but it should run ${EXPECTED_SEQUENCE.join(' \u2192 ')}. `;
        feedback.textContent = "🔎 " + msg;
        feedback.className = 'feedback show';
        sceneCaption5.textContent = "That crossing didn't go quite right — the order of steps matters.";
      }
    }

    step();
  }


  // CHAPTER 6 — OBJECTS — The Wolf's Trick
  const CH6_STARTER =
`# HOW OBJECTS WORK:
#   wolf = Wolf()   <- creates a new Wolf object named "wolf"
#   wolf.hide()      <- calls a METHOD on it, using a dot
#
# Available wolf methods (not all of these help here!):
#   wolf.hide()   -> ducks out of sight into the bushes
#   wolf.move()   -> slips away without being noticed
#   wolf.howl()   -> howls loudly at the moon
#   wolf.sit()    -> sits down and waits
#   wolf.sniff()  -> sniffs around for a scent
#
# The wolf asked where she was headed, and she told him all
# about Grandma's cottage. Now he wants to slip away toward it
# without her noticing — he should hide FIRST, then move while
# he's still hidden.

wolf = Wolf()

# wolf methods go here`;

  const EXPECTED_WOLF_SEQ = ['hide', 'move'];

  const sceneCaption6 = document.getElementById('sceneCaption6');
  const character6 = document.getElementById('character6');
  const wolfChar = document.getElementById('wolfChar');
  const wolfSmoke = document.getElementById('wolfSmoke');
  const gaspBubble = document.getElementById('gaspBubble');
  const wolfStatusText = document.getElementById('wolfStatusText');
  let ch6Animating = false;

  // Recognizes `wolf = Wolf()` and a sequence of `wolf.method()` calls.
  function parseChapter6(code){
    const lines = code.split('\n');
    let created = false, calls = [];
    for(const raw of lines){
      const line = raw.trim();
      if(!line || line.startsWith('#')) continue;
      let m;
      if(/^wolf\s*=\s*Wolf\(\)\s*$/.test(line)){ created = true; continue; }
      if((m = line.match(/^wolf\.(\w+)\(\)\s*$/))){ calls.push(m[1]); continue; }
    }
    return { created, calls };
  }

  function evalChapter6(p){
    const rightLength = p.calls.length === EXPECTED_WOLF_SEQ.length;
    const sequenceOK = rightLength && EXPECTED_WOLF_SEQ.every((a,i) => p.calls[i] === a);
    const pathOK = p.created && sequenceOK;
    return { ...p, rightLength, sequenceOK, pathOK };
  }

  function resetChapter6Scene(){
    character6.classList.remove('walking','startled');
    character6.style.left = '6%';
    setPose(document.getElementById('charImg6'), 'walk_basket');
    wolfChar.classList.remove('hidden','spotted');
    wolfChar.style.right = '16%';
    wolfSmoke.classList.remove('show');
    gaspBubble.classList.remove('show');
    wolfStatusText.textContent = 'watching from the clearing';
  }

  const HINTS6 = [
    "Objects have methods you call with a dot, like wolf.hide() \u2014 not every method listed above is useful right now.",
    "You'll need two lines: something to get him out of sight, and something to get him moving.",
    "Try: wolf.hide(), then wolf.move() \u2014 he should hide first, and only move once he's already out of sight."
  ];

  function resetChapter6(){
    codeArea.value = CH6_STARTER;
    updateLineNums();
    codePanel.classList.remove('valid-glow');
    sceneWrap.classList.remove('broken-pulse');
    resetChapter6Scene();
    sceneCaption6.textContent = "The wolf steps out and asks where she's headed — and she tells him all about Grandma's cottage.";
  }

  function runChapter6(){
    if(ch6Animating) return;
    const rawCode = codeArea.value;
    const parsed = parseChapter6(rawCode);
    const ev = evalChapter6(parsed);

    let html = '';
    html += debugRow('wolf object created', String(ev.created), ev.created);
    html += debugRow('methods called in order', ev.calls.length ? ev.calls.join(' \u2192 ') : '(none)', ev.rightLength);
    html += debugRow('matches expected order', EXPECTED_WOLF_SEQ.join(' \u2192 '), ev.sequenceOK);
    html += debugRow('ALL CHECKS PASS?', ev.pathOK ? 'YES' : 'NO', undefined);
    html += `<div class="debug-raw">Raw code Run just read:\n${esc(rawCode)}</div>`;
    debugBody.innerHTML = html;
    openDebug();

    if(!ev.created || !ev.rightLength){
      sceneWrap.classList.add('broken-pulse');
      codePanel.classList.remove('valid-glow');
      feedback.textContent = "🔎 Make sure wolf = Wolf() is there, and exactly two wolf method calls follow it.";
      feedback.className = 'feedback show';
      return;
    }

    ch6Animating = true;
    resetChapter6Scene();
    codePanel.classList.remove('valid-glow');
    sceneWrap.classList.remove('broken-pulse');
    feedback.className = 'feedback';

    let i = 0;
    function step(){
      if(i >= EXPECTED_WOLF_SEQ.length){ finish(); return; }
      const action = ev.calls[i];

      if(action === 'hide'){
        wolfChar.classList.add('hidden');
        wolfSmoke.classList.add('show');
        wolfStatusText.textContent = 'hidden in the bushes';
        setTimeout(()=>{ wolfSmoke.classList.remove('show'); i++; setTimeout(step, 250); }, 550);
      } else if(action === 'move'){
        const wasHidden = wolfChar.classList.contains('hidden');
        wolfChar.style.right = '38%';
        if(!wasHidden){
          wolfChar.classList.add('spotted');
          character6.classList.add('startled');
          setPose(document.getElementById('charImg6'), 'startled');
          gaspBubble.classList.add('show');
          wolfStatusText.textContent = 'spotted — she saw him move!';
          setTimeout(()=>{
            gaspBubble.classList.remove('show');
            character6.classList.remove('startled');
            setPose(document.getElementById('charImg6'), 'walk_basket');
            wolfChar.classList.remove('spotted');
            i++; setTimeout(step, 300);
          }, 700);
        } else {
          wolfStatusText.textContent = 'creeping closer, unseen';
          setTimeout(()=>{ i++; setTimeout(step, 250); }, 600);
        }
      } else {
        i++; setTimeout(step, 200);
      }
    }

    function finish(){
      ch6Animating = false;

      if(ev.pathOK){
        solved = true;
        codePanel.classList.add('valid-glow');
        feedback.textContent = "✅ The wolf hid first, then slipped away — completely unseen!";
        feedback.className = 'feedback show success';
        sceneCaption6.textContent = "Little Red lingers to admire some flowers, unaware of where the wolf has gone.";
        character6.classList.add('walking');
        setTimeout(()=>{ character6.style.left = '88%'; }, 100);
        spawnParticles();

        setTimeout(()=>{
          wolfChar.classList.remove('hidden');
          wolfChar.classList.add('dash-away');
          wolfStatusText.textContent = 'racing ahead to the cottage!';
          sceneCaption6.textContent = "While she's distracted, the wolf breaks into a run through the trees — straight for Grandma's cottage.";
        }, 1500);

        setTimeout(()=>{
          addXP(hintsUsed === 0 ? 60 : 40);
          showToast('Object Engineer', hintsUsed===0 ? '+60 XP · No hints used!' : '+40 XP');
          chapters[5].state = 'complete';
          chapters[6].state = 'active';
          renderTrail();
          switchToChapter(7);
        }, 3100);
      } else {
        sceneWrap.classList.add('broken-pulse');
        let msg = "Something is still off. ";
        if(!ev.sequenceOK) msg += `wolf calls ${ev.calls.join(' \u2192 ')}, but he needs to ${EXPECTED_WOLF_SEQ.join(' \u2192 ')} instead. `;
        feedback.textContent = "🔎 " + msg;
        feedback.className = 'feedback show';
        sceneCaption6.textContent = "That didn't go unnoticed — the order of his actions matters.";
      }
    }

    step();
  }


  // CHAPTER 7 — LISTS — The Path to Grandma's House
  const CH7_STARTER =
`# Lists start counting from 0, not 1!
#   items[0] -> the FIRST item
#   items[1] -> the SECOND item
#   items[2] -> the THIRD item
#
# Grandma specifically asked for cheese today.
items = ["bread", "cheese", "jam"]

give_to_grandma(items[0])`;

  const ITEMS_LIST = ['bread', 'cheese', 'jam'];
  const TARGET_ITEM = 'cheese';
  const ICONS = { bread: '🍞', cheese: '🧀', jam: '🍯' };

  const sceneCaption7 = document.getElementById('sceneCaption7');
  const character7 = document.getElementById('character7');
  const handoffItem = document.getElementById('handoffItem');
  const slotEls = [0,1,2].map(i => document.getElementById('slot'+i));
  let ch7Animating = false;

  // Recognizes `items = [...]` and `give_to_grandma(items[N])`.
  function parseChapter7(code){
    const lines = code.split('\n');
    let items = null, index = null;
    for(const raw of lines){
      const line = raw.trim();
      if(!line || line.startsWith('#')) continue;
      let m;
      if((m = line.match(/^items\s*=\s*\[([^\]]*)\]/))){
        items = m[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        continue;
      }
      if((m = line.match(/^give_to_grandma\(\s*items\[(\d+)\]\s*\)\s*$/))){
        index = parseInt(m[1], 10);
        continue;
      }
    }
    return { items, index };
  }

  function evalChapter7(p){
    const hasStructure = Array.isArray(p.items) && p.index !== null;
    const inRange = hasStructure && p.index >= 0 && p.index < p.items.length;
    const selectedItem = inRange ? p.items[p.index] : null;
    const pathOK = selectedItem === TARGET_ITEM;
    return { ...p, hasStructure, inRange, selectedItem, pathOK };
  }

  function resetChapter7Scene(){
    slotEls.forEach(s => s.classList.remove('selected','correct','wrong'));
    character7.classList.remove('walking');
    character7.style.left = '8%';
    handoffItem.classList.remove('show');
    handoffItem.textContent = '';
    setPose(document.getElementById('charImg7'), 'walk_basket');
  }

  const HINTS7 = [
    "Lists count from 0, not 1 \u2014 items[0] is the FIRST item, not the second.",
    "Cheese is the second item in the list. What index is that?",
    "items[0] is \"bread\". Try items[1] instead."
  ];

  function resetChapter7(){
    codeArea.value = CH7_STARTER;
    updateLineNums();
    codePanel.classList.remove('valid-glow');
    sceneWrap.classList.remove('broken-pulse');
    resetChapter7Scene();
    sceneCaption7.textContent = "Grandma's house is finally in sight — she has no idea the wolf reached it first. First, one last check of the basket.";
  }

  function runChapter7(){
    if(ch7Animating) return;
    const rawCode = codeArea.value;
    const parsed = parseChapter7(rawCode);
    const ev = evalChapter7(parsed);

    let html = '';
    html += debugRow('items list', ev.items ? JSON.stringify(ev.items) : '(missing)', ev.hasStructure);
    html += debugRow('index used', ev.index ?? '(missing)', ev.inRange);
    html += debugRow('items[index] resolves to', ev.selectedItem ?? '(n/a)', ev.pathOK);
    html += debugRow('Grandma wants', TARGET_ITEM, undefined);
    html += debugRow('ALL CHECKS PASS?', ev.pathOK ? 'YES' : 'NO', undefined);
    html += `<div class="debug-raw">Raw code Run just read:\n${esc(rawCode)}</div>`;
    debugBody.innerHTML = html;
    openDebug();

    if(!ev.hasStructure){
      sceneWrap.classList.add('broken-pulse');
      codePanel.classList.remove('valid-glow');
      feedback.textContent = "🔎 Make sure items is a list and give_to_grandma(items[...]) uses an index.";
      feedback.className = 'feedback show';
      return;
    }
    if(!ev.inRange){
      sceneWrap.classList.add('broken-pulse');
      codePanel.classList.remove('valid-glow');
      feedback.textContent = `🔎 Index ${ev.index} is out of range \u2014 the list only has ${ev.items.length} items (indices 0-${ev.items.length-1}).`;
      feedback.className = 'feedback show';
      return;
    }

    ch7Animating = true;
    resetChapter7Scene();
    codePanel.classList.remove('valid-glow');
    sceneWrap.classList.remove('broken-pulse');
    feedback.className = 'feedback';

    slotEls[ev.index].classList.add('selected');
    character7.classList.add('walking');
    handoffItem.textContent = ICONS[ev.selectedItem] || '❓';

    setTimeout(()=>{
      handoffItem.classList.add('show');
      setTimeout(()=>{
        character7.classList.remove('walking');
        finish();
      }, 850);
    }, 300);

    function finish(){
      ch7Animating = false;

      if(ev.pathOK){
        solved = true;
        codePanel.classList.add('valid-glow');
        slotEls[ev.index].classList.add('correct');
        feedback.textContent = "✅ Exactly what Grandma asked for — cheese, from the right spot in the list!";
        feedback.className = 'feedback show success';
        sceneCaption7.textContent = "With the cheese delivered, the path to Grandma's door is clear.";
        setPose(document.getElementById('charImg7'), 'joyful');
        spawnParticles();

        setTimeout(()=>{
          addXP(hintsUsed === 0 ? 60 : 40);
          showToast('List Explorer', hintsUsed===0 ? '+60 XP · No hints used!' : '+40 XP');
          chapters[6].state = 'complete';
          chapters[7].state = 'active';
          renderTrail();
          switchToChapter(8);
        }, 1400);
      } else {
        sceneWrap.classList.add('broken-pulse');
        slotEls[ev.index].classList.add('wrong');
        feedback.textContent = `🔎 items[${ev.index}] is "${ev.selectedItem}", but Grandma asked for cheese.`;
        feedback.className = 'feedback show';
        sceneCaption7.textContent = "That's not quite what Grandma wanted.";
      }
    }
  }


  // CHAPTER 8 — FINAL DEBUGGING — The Trick at the Cottage
  const CH8_STARTER =
`# Little Red notices strange things about "Grandma" in bed.
#
# Available actions (not all of these help here!):
#   open_closet()  -> opens the closet to look inside
#   give_basket()  -> hands over the basket
#   run_away()     -> turns and runs outside
#   say_hello()    -> just says a polite hello
#
big_eyes = False
big_ears = False
big_teeth = False

is_the_wolf = big_eyes and big_ears and big_teeth

if is_the_wolf:
    # function goes here
else:
    # function goes here`;

  const sceneCaption8 = document.getElementById('sceneCaption8');
  const character8 = document.getElementById('character8');
  const dialogueBubble = document.getElementById('dialogueBubble');
  const closetDoor = document.getElementById('closetDoor');
  const bedScene = document.getElementById('bedScene');
  let ch8Animating = false;
  let ch8IntroPlayed = false;

  const INTRO_LINES = [
    "Little Red: What big eyes you have, Grandma!",
    "\u201cGrandma\u201d: The better to see you with, my dear.",
    "Little Red: What big ears you have!",
    "\u201cGrandma\u201d: The better to hear you with!",
    "Little Red: ...and what big teeth you have!",
    "\u201cGrandma\u201d: ...the better to eat you with!!"
  ];

  function playIntroDialogue(){
    if(ch8IntroPlayed) return;
    ch8IntroPlayed = true;
    let i = 0;
    function nextLine(){
      if(i >= INTRO_LINES.length){
        dialogueBubble.classList.remove('show');
        setPose(document.getElementById('charImg8'), 'startled');
        sceneCaption8.textContent = "Something is very wrong here. Time to figure out the truth.";
        return;
      }
      dialogueBubble.textContent = INTRO_LINES[i];
      dialogueBubble.classList.add('show');
      // her lines (even indices) show growing alarm; "Grandma"'s replies (odd) keep her watching warily
      setPose(document.getElementById('charImg8'), i % 2 === 0 ? 'startled' : 'walk_basket');
      if(i % 2 === 0) character8.classList.add('startled'); else character8.classList.remove('startled');
      i++;
      setTimeout(nextLine, 3000);
    }
    setTimeout(nextLine, 700);
  }

  // Recognizes the three booleans, and the if/else action calls.
  function parseChapter8(code){
    const lines = code.split('\n');
    const bools = {};
    let ifAction = null, elseAction = null, mode = null;
    for(const raw of lines){
      const line = raw.trim();
      if(!line || line.startsWith('#')) continue;
      let m;
      if((m = line.match(/^(big_eyes|big_ears|big_teeth)\s*=\s*(True|False)/))){
        bools[m[1]] = m[2] === 'True'; continue;
      }
      if(/^if\s+is_the_wolf\s*:/.test(line)){ mode = 'if'; continue; }
      if(/^else\s*:/.test(line)){ mode = 'else'; continue; }
      if((m = line.match(/^(\w+)\(\)\s*$/))){
        if(mode === 'if' && ifAction === null) ifAction = m[1];
        else if(mode === 'else' && elseAction === null) elseAction = m[1];
        continue;
      }
    }
    return { bools, ifAction, elseAction };
  }

  function evalChapter8(p){
    const allNoticed = p.bools.big_eyes === true && p.bools.big_ears === true && p.bools.big_teeth === true;
    const structureOK = p.ifAction === 'open_closet' && p.elseAction === 'give_basket';
    const takenAction = structureOK ? (allNoticed ? p.ifAction : p.elseAction) : null;
    const pathOK = allNoticed && structureOK;
    return { ...p, allNoticed, structureOK, takenAction, pathOK };
  }

  function resetChapter8Scene(){
    character8.classList.remove('walking','startled');
    character8.style.left = '8%';
    closetDoor.classList.remove('open');
    bedScene.classList.remove('busted');
    dialogueBubble.classList.remove('show');
    setPose(document.getElementById('charImg8'), 'walk_basket');
  }

  const HINTS8 = [
    "She clearly notices the eyes, the ears, AND the teeth in the dialogue above \u2014 what should all three booleans be?",
    "is_the_wolf only becomes True if big_eyes, big_ears, AND big_teeth are all True.",
    "Once is_the_wolf is True, the if branch should open_closet() \u2014 and the else branch should give_basket()."
  ];

  function resetChapter8(){
    codeArea.value = CH8_STARTER;
    updateLineNums();
    codePanel.classList.remove('valid-glow');
    sceneWrap.classList.remove('broken-pulse');
    resetChapter8Scene();
    sceneCaption8.textContent = "Little Red steps into the cottage — something about \u201cGrandma\u201d looks different today.";
    ch8IntroPlayed = false;
    playIntroDialogue();
  }

  function runChapter8(){
    if(ch8Animating) return;
    const rawCode = codeArea.value;
    const parsed = parseChapter8(rawCode);
    const ev = evalChapter8(parsed);

    let html = '';
    html += debugRow('big_eyes', String(ev.bools.big_eyes), ev.bools.big_eyes === true);
    html += debugRow('big_ears', String(ev.bools.big_ears), ev.bools.big_ears === true);
    html += debugRow('big_teeth', String(ev.bools.big_teeth), ev.bools.big_teeth === true);
    html += debugRow('is_the_wolf (all three AND)', String(ev.allNoticed), ev.allNoticed);
    html += debugRow('if/else structure', ev.structureOK ? 'open_closet() / give_basket()' : '(incomplete)', ev.structureOK);
    html += debugRow('action taken', ev.takenAction ?? '(none)', ev.pathOK);
    html += debugRow('ALL CHECKS PASS?', ev.pathOK ? 'YES' : 'NO', undefined);
    html += `<div class="debug-raw">Raw code Run just read:\n${esc(rawCode)}</div>`;
    debugBody.innerHTML = html;
    openDebug();

    if(!ev.structureOK){
      sceneWrap.classList.add('broken-pulse');
      codePanel.classList.remove('valid-glow');
      feedback.textContent = "🔎 The if/else structure isn't complete \u2014 check open_closet() and give_basket() are both there.";
      feedback.className = 'feedback show';
      return;
    }

    ch8Animating = true;
    codePanel.classList.remove('valid-glow');
    sceneWrap.classList.remove('broken-pulse');
    feedback.className = 'feedback';

    if(ev.pathOK){
      solved = true;
      codePanel.classList.add('valid-glow');
      character8.classList.add('walking');
      setTimeout(()=>{ character8.style.left = '30%'; }, 100);
      setTimeout(()=>{
        closetDoor.classList.add('open');
        bedScene.classList.add('busted');
        setPose(document.getElementById('charImg8'), 'joyful');
        feedback.textContent = "✅ She sees straight through the disguise and frees Grandma from the closet!";
        feedback.className = 'feedback show success';
        sceneCaption8.textContent = "The real Grandma bursts out of the closet — the wolf's trick is over.";
        spawnParticles();
      }, 700);

      setTimeout(()=>{
        ch8Animating = false;
        addXP(hintsUsed === 0 ? 70 : 45);
        showToast('Debug Detective', hintsUsed===0 ? '+70 XP · No hints used!' : '+45 XP');
        chapters[7].state = 'complete';
        chapters[8].state = 'active';
        renderTrail();
        switchToChapter(9);
      }, 2400);
    } else {
      ch8Animating = false;
      sceneWrap.classList.add('broken-pulse');
      character8.classList.add('startled');
      setPose(document.getElementById('charImg8'), 'startled');
      let msg = "Something still isn't right. ";
      if(!ev.allNoticed) msg += "Not everything she noticed is being taken seriously \u2014 check all three booleans. ";
      feedback.textContent = "🔎 " + msg;
      feedback.className = 'feedback show';
      sceneCaption8.textContent = "The basket almost slips from her hands \u2014 something needs fixing, fast.";
      setTimeout(()=>{ character8.classList.remove('startled'); setPose(document.getElementById('charImg8'), 'walk_basket'); }, 600);
    }
  }


  // CHAPTER 9 — ENDING — The Rescue
  const CH9_STARTER =
`# Available actions (not all of these help here!):
#   knock_out_wolf()  -> Little Red and Grandma team up to stop him
#   call_police()     -> they call for help
#   hug_grandma()     -> they celebrate together, safe at last
#   run_in_circles()  -> panics and runs around in circles
#   hide_again()      -> ducks back into the closet to hide
#
# Grandma's plan: stop the wolf first, THEN call for help,
# THEN celebrate once help is on the way.

def finish_rescue():
    # functions go here

finish_rescue()`;

  const EXPECTED_SEQUENCE9 = ['knock_out_wolf', 'call_police', 'hug_grandma'];

  const sceneCaption9 = document.getElementById('sceneCaption9');
  const character9 = document.getElementById('character9');
  const wolfDown9 = document.getElementById('wolfDown9');
  const grandma9 = document.getElementById('grandma9');
  const policeFlash9 = document.getElementById('policeFlash9');
  const dialogueBubble9 = document.getElementById('dialogueBubble9');
  let ch9Animating = false;

  function parseChapter9(code){
    const lines = code.split('\n');
    let funcName = null, calls = [], calledAfter = false, inFunc = false;
    for(const raw of lines){
      const trimmed = raw.trim();
      if(!trimmed || trimmed.startsWith('#')) continue;
      const indent = raw.match(/^(\s*)/)[1].length;
      let m;
      if((m = trimmed.match(/^def\s+(\w+)\s*\(\s*\)\s*:/))){
        funcName = m[1]; inFunc = true; continue;
      }
      if(inFunc){
        if(indent === 0){
          inFunc = false;
        } else {
          if((m = trimmed.match(/^(\w+)\(\)\s*$/))) calls.push(m[1]);
          continue;
        }
      }
      if(funcName && trimmed === funcName + '()'){ calledAfter = true; continue; }
    }
    return { funcName, calls, calledAfter };
  }

  function evalChapter9(p){
    const rightLength = p.calls.length === EXPECTED_SEQUENCE9.length;
    const sequenceOK = rightLength && EXPECTED_SEQUENCE9.every((a,i) => p.calls[i] === a);
    const pathOK = sequenceOK && p.calledAfter;
    return { ...p, rightLength, sequenceOK, pathOK };
  }

  function resetChapter9Scene(){
    wolfDown9.classList.remove('dizzy','gone');
    grandma9.classList.remove('show');
    policeFlash9.classList.remove('active');
    dialogueBubble9.classList.remove('show');
    character9.classList.remove('walking','joyful-bounce');
    setPose(document.getElementById('charImg9'), 'walk_basket');
    setPose(document.getElementById('wolfImg9'), 'wolf_angry');
    setPose(document.getElementById('grandmaImg9'), 'grandma_door');
  }

  const HINTS9 = [
    "Not every action listed above is actually useful here \u2014 running in circles or hiding again won't finish the rescue.",
    "They should deal with the wolf FIRST, before doing anything else.",
    "Try: knock_out_wolf(), then call_police(), then hug_grandma()."
  ];

  function resetChapter9(){
    codeArea.value = CH9_STARTER;
    updateLineNums();
    codePanel.classList.remove('valid-glow');
    sceneWrap.classList.remove('broken-pulse');
    resetChapter9Scene();
    sceneCaption9.textContent = "The wolf's trick is over — now they just need to finish this the right way.";
  }

  function showBubble9(text, ms){
    dialogueBubble9.textContent = text;
    dialogueBubble9.classList.add('show');
    setTimeout(()=> dialogueBubble9.classList.remove('show'), ms || 1200);
  }

  function runChapter9(){
    if(ch9Animating) return;
    const rawCode = codeArea.value;
    const parsed = parseChapter9(rawCode);
    const ev = evalChapter9(parsed);

    let html = '';
    html += debugRow('function defined', ev.funcName ?? '(missing)', undefined);
    html += debugRow('steps found in order', ev.calls.length ? ev.calls.join(' \u2192 ') : '(none)', ev.rightLength);
    html += debugRow('matches expected order', EXPECTED_SEQUENCE9.join(' \u2192 '), ev.sequenceOK);
    html += debugRow('function actually called', String(ev.calledAfter), ev.calledAfter);
    html += debugRow('ALL CHECKS PASS?', ev.pathOK ? 'YES' : 'NO', undefined);
    html += `<div class="debug-raw">Raw code Run just read:\n${esc(rawCode)}</div>`;
    debugBody.innerHTML = html;
    openDebug();

    if(!ev.funcName || !ev.rightLength){
      sceneWrap.classList.add('broken-pulse');
      codePanel.classList.remove('valid-glow');
      feedback.textContent = "🔎 finish_rescue() needs exactly three steps inside it \u2014 check the function body.";
      feedback.className = 'feedback show';
      return;
    }
    if(!ev.calledAfter){
      sceneWrap.classList.add('broken-pulse');
      codePanel.classList.remove('valid-glow');
      feedback.textContent = "🔎 Defining finish_rescue() isn't enough \u2014 it also needs to actually be called.";
      feedback.className = 'feedback show';
      return;
    }

    ch9Animating = true;
    resetChapter9Scene();
    codePanel.classList.remove('valid-glow');
    sceneWrap.classList.remove('broken-pulse');
    feedback.className = 'feedback';

    let i = 0;
    function step(){
      if(i >= EXPECTED_SEQUENCE9.length){ finish(); return; }
      const actual = ev.calls[i];

      if(actual === 'knock_out_wolf'){
        wolfDown9.classList.add('dizzy');
        showBubble9("They team up and stop him!");
        setTimeout(()=>{ i++; setTimeout(step, 300); }, 900);
      } else if(actual === 'call_police'){
        policeFlash9.classList.add('active');
        if(!wolfDown9.classList.contains('dizzy')){
          showBubble9("Wait \u2014 he's still awake!");
        } else {
          showBubble9("Help is on the way!");
        }
        setTimeout(()=>{ i++; setTimeout(step, 300); }, 900);
      } else if(actual === 'hug_grandma'){
        grandma9.classList.add('show');
        character9.classList.add('joyful-bounce');
        setPose(document.getElementById('charImg9'), 'joyful');
        showBubble9("Reunited at last!");
        setTimeout(()=>{ character9.classList.remove('joyful-bounce'); i++; setTimeout(step, 300); }, 900);
      } else {
        i++; setTimeout(step, 200);
      }
    }

    function finish(){
      ch9Animating = false;

      if(ev.pathOK){
        solved = true;
        codePanel.classList.add('valid-glow');
        feedback.textContent = "✅ The wolf is stopped, help is coming, and everyone's safe!";
        feedback.className = 'feedback show success';
        sceneCaption9.textContent = "The police take the wolf away, and the forest is safe once again.";
        spawnParticles();

        setTimeout(()=>{
          policeFlash9.classList.remove('active');
          wolfDown9.classList.add('gone');
        }, 1400);

        setTimeout(()=>{
          addXP(hintsUsed === 0 ? 80 : 55);
          showToast('CodeTales Champion', hintsUsed===0 ? '+80 XP · No hints used!' : '+55 XP');
          chapters[8].state = 'complete';
          renderTrail();
          showStoryComplete();
        }, 2400);
      } else {
        sceneWrap.classList.add('broken-pulse');
        let msg = "Something is still out of order. ";
        if(!ev.sequenceOK) msg += `finish_rescue() runs ${ev.calls.join(' \u2192 ')}, but it should run ${EXPECTED_SEQUENCE9.join(' \u2192 ')}. `;
        feedback.textContent = "🔎 " + msg;
        feedback.className = 'feedback show';
        sceneCaption9.textContent = "That didn't go quite right \u2014 the order of steps matters.";
      }
    }

    step();
  }

  const SKILLS_PRACTICED = ['Variables','Conditions','Loops','Functions','Objects','Lists','Debugging'];

  function showStoryComplete(){
    document.getElementById('finalXP').textContent = totalXP;
    const achEl = document.getElementById('finalAchievements');
    achEl.innerHTML = earnedAchievements.map(a => `<span class="achievement-chip">🏆 ${a}</span>`).join('');
    const skillEl = document.getElementById('finalSkills');
    skillEl.innerHTML = SKILLS_PRACTICED.map(s => `<span class="skill-chip">${s}</span>`).join('');
    document.getElementById('storyCompleteOverlay').classList.add('show');
  }


  const CHAPTER_META = {
    1: { eyebrow:"Chapter 1 · Variables", title:"Leaving Home",
         desc:"Little Red's basket, her destination, and her readiness to leave are all controlled by variables below — but a few of them are wrong. Fix them so she can set off for Grandma's house.",
         reset: resetChapter1, run: runChapter1, hints: HINTS1, sceneEl: 'scene1' },
    2: { eyebrow:"Chapter 2 · Conditions", title:"The Forest Path",
         desc:"A storm has rolled in, and the old bridge isn't safe to cross. The pseudocode above the code tells you the rule — fill in the blank so the condition actually follows it.",
         reset: resetChapter2, run: runChapter2, hints: HINTS2, sceneEl: 'scene2' },
    3: { eyebrow:"Chapter 3 · Loops", title:"Meeting the Wolf",
         desc:"A wolf steps out onto the path and has a few things to say before he'll let her by. Fix the loop so all of his lines actually play.",
         reset: resetChapter3, run: runChapter3, hints: HINTS3, sceneEl: 'scene3' },
    4: { eyebrow:"Chapter 4 · Loops", title:"The Endless Forest",
         desc:"Five flowers grow along this path. Fix the loop so it repeats the right number of times to collect every one of them.",
         reset: resetChapter4, run: runChapter4, hints: HINTS4, sceneEl: 'scene4' },
    5: { eyebrow:"Chapter 5 · Functions", title:"Grandma's Special Instructions",
         desc:"cross_log() bundles up the steps for crossing the gap \u2014 but they're not in the order Grandma described. Fix the order inside the function.",
         reset: resetChapter5, run: runChapter5, hints: HINTS5, sceneEl: 'scene5' },
    6: { eyebrow:"Chapter 6 · Objects", title:"The Wolf's Trick",
         desc:"The wolf is an object with his own methods, wolf.hide() and wolf.move(). While she's busy with the flowers, he moves before he hides. Fix the order so he slips away unseen.",
         reset: resetChapter6, run: runChapter6, hints: HINTS6, sceneEl: 'scene6' },
    7: { eyebrow:"Chapter 7 · Lists", title:"The Path to Grandma's House",
         desc:"The basket's contents are a list, and Grandma wants the second item \u2014 cheese. Lists count from 0, so check which index that actually is.",
         reset: resetChapter7, run: runChapter7, hints: HINTS7, sceneEl: 'scene7' },
    8: { eyebrow:"Chapter 8 · Debugging", title:"The Trick at the Cottage",
         desc:"Something in this cottage doesn't add up. Little Red noticed the eyes, the ears, AND the teeth \u2014 make sure the code takes all three seriously.",
         reset: resetChapter8, run: runChapter8, hints: HINTS8, sceneEl: 'scene8' },
    9: { eyebrow:"Chapter 9 · Ending", title:"The Rescue",
         desc:"finish_rescue() has the right idea but the wrong order \u2014 make sure the wolf is dealt with before anyone celebrates.",
         reset: resetChapter9, run: runChapter9, hints: HINTS9, sceneEl: 'scene9' },
  };

  function switchToChapter(n){
    currentChapter = n;
    hintsUsed = 0;
    hintIndex = 0;
    solved = false;
    feedback.className = 'feedback';
    debugBody.innerHTML = 'Run the code to see a breakdown here.';
    debugOpen = false;
    debugBody.classList.remove('open');
    debugChevron.textContent = '▾';

    Object.keys(CHAPTER_META).forEach(key => {
      const el = document.getElementById(CHAPTER_META[key].sceneEl);
      if(el) el.style.display = (parseInt(key,10) === n) ? '' : 'none';
    });
    sceneWrap.classList.remove('broken-pulse');

    const meta = CHAPTER_META[n];
    chapterEyebrow.textContent = meta.eyebrow;
    chapterTitleText.textContent = meta.title;
    chapterDescText.textContent = meta.desc;
    meta.reset();
  }

  document.getElementById('hintBtn').addEventListener('click', ()=>{
    hintsUsed++;
    const hints = CHAPTER_META[currentChapter].hints;
    feedback.textContent = "💡 " + hints[hintIndex % hints.length];
    feedback.className = 'feedback show';
    hintIndex++;
  });

  document.getElementById('resetBtn').addEventListener('click', ()=>{
    solved = false;
    feedback.className = 'feedback';
    debugBody.innerHTML = 'Run the code to see a breakdown here.';
    CHAPTER_META[currentChapter].reset();
  });

  document.getElementById('runBtn').addEventListener('click', ()=>{
    if(solved) return;
    CHAPTER_META[currentChapter].run();
  });

  // SCREEN NAVIGATION — landing -> map -> game
  let gameStarted = false;
  let gameCompleted = false;

  function showScreen(name){
    document.getElementById('landingScreen').style.display = name === 'landing' ? '' : 'none';
    document.getElementById('mapScreen').style.display = name === 'map' ? '' : 'none';
    document.getElementById('gameScreen').style.display = name === 'game' ? '' : 'none';
  }

  function updateCardStatus(){
    const el = document.getElementById('cardLRRHStatus');
    if(gameCompleted) el.textContent = 'Completed! \u2b50 Play again';
    else if(gameStarted) el.textContent = `Chapter ${currentChapter} of 9`;
    else el.textContent = 'Not started';
  }

  document.getElementById('landingStartBtn').addEventListener('click', ()=>{
    updateCardStatus();
    showScreen('map');
  });

  function resetEntireGame(){
    chapters.forEach((c, i) => { c.state = i === 0 ? 'active' : 'locked'; });
    xp = 0;
    totalXP = 0;
    earnedAchievements = [];
    gameCompleted = false;
    document.getElementById('xpFill').style.width = '0%';
    document.getElementById('xpNum').textContent = '0';
    document.getElementById('storyCompleteOverlay').classList.remove('show');
    switchToChapter(1);
    renderTrail();
  }

  document.getElementById('cardLRRH').addEventListener('click', ()=>{
    if(gameCompleted){
      resetEntireGame();
    }
    gameStarted = true;
    showScreen('game');
  });

  document.getElementById('storyCompleteBackToMap').addEventListener('click', ()=>{
    document.getElementById('storyCompleteOverlay').classList.remove('show');
    gameCompleted = true;
    updateCardStatus();
    showScreen('map');
  });

  // init
  switchToChapter(1);
  showScreen('landing');
})();
