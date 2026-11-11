const themeButton = document.getElementById("theme-toggle");
const themeIcon = themeButton.querySelector(".theme-icon");
const themeLabel = themeButton.querySelector(".theme-label");
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const dark = theme === "dark";
  themeIcon.textContent = dark ? "☀" : "☾";
  themeLabel.textContent = dark ? "Modo claro" : "Modo oscuro";
  themeButton.setAttribute("aria-label", dark ? "Activar modo claro" : "Activar modo oscuro");
}
applyTheme(localStorage.getItem("study-theme") === "dark" ? "dark" : "light");
themeButton.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme); localStorage.setItem("study-theme", nextTheme);
});

const unitInfo = {
  "10": "Unidad 10 · Cosmetología aplicada",
  "11": "Unidad 11 · Diagnóstico de la piel y asesoramiento personal",
  "12": "Unidad 12 · Consentimientos informados",
  "all": "Examen conjunto · Unidades 10, 11 y 12"
};
const unitCards=document.querySelector(".units-section"), welcome=document.querySelector(".welcome"), helpStrip=document.querySelector(".help-strip");
const modePanel=document.getElementById("mode-panel"), selectedTitle=document.getElementById("selected-title"), examDescription=document.getElementById("exam-description");
const quizPanel=document.getElementById("quiz-panel");
const questionCounter=document.getElementById("question-counter"), scoreCounter=document.getElementById("score-counter"), progressFill=document.getElementById("progress-fill");
const questionText=document.getElementById("question-text"), answerOptions=document.getElementById("answer-options"), answerFeedback=document.getElementById("answer-feedback");
const checkButton=document.getElementById("check-answer"), nextButton=document.getElementById("next-question"), questionCard=document.getElementById("question-card"), resultCard=document.getElementById("result-card");
let selectedUnit=null, examType="unit", questions=[], currentQuestion=0, selectedAnswer=null, correctCount=0, answered=false, answerLog=[];
function shuffle(items){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
// Distribuye la posición correcta de forma equilibrada en cada examen y mezcla los distractores.
function prepareQuestions(items){
  const positions=[]; for(let i=0;i<items.length;i++) positions.push(i%4);
  const balancedPositions=shuffle(positions);
  return shuffle(items).map((q,index)=>{
    const correctText=q.opciones[q.correcta];
    const distractors=shuffle(q.opciones.filter((_,i)=>i!==q.correcta));
    const options=[...distractors];
    options.splice(balancedPositions[index],0,correctText);
    return {...q,opciones:options,correcta:balancedPositions[index]};
  });
}
function readHistory(){try{return JSON.parse(localStorage.getItem("study-exam-history")||"[]");}catch{return[];}}
function saveHistory(history){localStorage.setItem("study-exam-history",JSON.stringify(history));}
function readSeenCombined(){try{return JSON.parse(localStorage.getItem("combined-seen-ids")||"[]");}catch{return[];}}
function selectCombinedQuestions(){
  const pool=window.bancoConjunto||[]; let seen=readSeenCombined(); const ids=new Set(seen);
  let unseen=shuffle(pool.filter(q=>!ids.has(q.id)));
  if(unseen.length>=30)return unseen.slice(0,30);
  if(unseen.length===0){seen=[];unseen=shuffle(pool);}
  const selected=[...unseen], selectedIds=new Set(selected.map(q=>q.id));
  selected.push(...shuffle(pool.filter(q=>!selectedIds.has(q.id))).slice(0,30-selected.length));
  return selected;
}
document.querySelectorAll(".unit-action").forEach(button=>button.addEventListener("click",()=>{
  selectedUnit=button.dataset.unit; examType="unit";
  const bank=window.bancosPreguntas?.[selectedUnit]||[];
  selectedTitle.textContent=unitInfo[selectedUnit];
  examDescription.textContent=`${bank.length} preguntas tipo test. Las opciones se mezclan y la posición correcta varía en cada intento.`;
  modePanel.hidden=false; modePanel.scrollIntoView({behavior:"smooth",block:"nearest"});
}));
document.getElementById("close-panel").addEventListener("click",()=>modePanel.hidden=true);
document.getElementById("start-exam").addEventListener("click",startUnitExam);
document.getElementById("start-combined").addEventListener("click",startCombinedExam);
document.getElementById("check-answer").addEventListener("click",checkAnswer);
document.getElementById("next-question").addEventListener("click",nextQuestion);
document.getElementById("retry-exam").addEventListener("click",retryExam);
document.getElementById("back-home").addEventListener("click",returnHome);
document.getElementById("result-home").addEventListener("click",returnHome);
function beginExam(selectedQuestions,type,alreadyPrepared=false){
  questions=alreadyPrepared?[...selectedQuestions]:prepareQuestions(selectedQuestions);
  examType=type; currentQuestion=0; correctCount=0; selectedAnswer=null; answered=false; answerLog=[];
  modePanel.hidden=true; welcome.hidden=true; unitCards.hidden=true; helpStrip.hidden=true;
  document.getElementById("history-section").hidden=true; quizPanel.hidden=false;
  document.getElementById("quiz-unit-label").textContent=type==="combined"?unitInfo.all:unitInfo[selectedUnit];
  renderQuestion(); quizPanel.scrollIntoView({behavior:"smooth",block:"start"});
}
function startUnitExam(){const bank=window.bancosPreguntas?.[selectedUnit]||[];if(bank.length)beginExam(bank,"unit");}
function startCombinedExam(){selectedUnit="all";beginExam(selectCombinedQuestions(),"combined");}
function retryExam(){if(examType==="combined")startCombinedExam();else startUnitExam();}
function replayHistoryExam(recordId){
  const record=readHistory().find(item=>String(item.id)===String(recordId));
  if(!record || record.tipo!=="combined" || !Array.isArray(record.respuestas))return;
  selectedUnit="all";
  const sameQuestions=record.respuestas.map(answer=>({
    pregunta:answer.pregunta,
    opciones:[...answer.opciones],
    correcta:answer.correcta,
    explicacion:answer.explicacion,
    unidad:answer.unidad
  }));
  beginExam(sameQuestions,"combined",true);
}
function renderQuestion(){
  const item=questions[currentQuestion]; selectedAnswer=null; answered=false; resultCard.hidden=true; questionCard.hidden=false;
  answerFeedback.hidden=true;answerFeedback.textContent="";nextButton.hidden=true;checkButton.hidden=false;checkButton.disabled=true;
  questionCounter.textContent=`PREGUNTA ${currentQuestion+1} DE ${questions.length}`;scoreCounter.textContent=`Aciertos: ${correctCount}`;
  progressFill.style.width=`${currentQuestion/questions.length*100}%`;questionText.textContent=item.pregunta;answerOptions.innerHTML="";
  item.opciones.forEach((option,index)=>{const button=document.createElement("button");button.type="button";button.className="answer-option";
    button.innerHTML=`<span class="option-letter">${String.fromCharCode(65+index)}</span><span class="option-text"></span>`;
    button.querySelector(".option-text").textContent=option;button.addEventListener("click",()=>{if(answered)return;selectedAnswer=index;
      answerOptions.querySelectorAll(".answer-option").forEach(el=>el.classList.remove("selected"));button.classList.add("selected");checkButton.disabled=false;});answerOptions.appendChild(button);});
}
function checkAnswer(){
  if(selectedAnswer===null||answered)return;answered=true;const item=questions[currentQuestion];const isCorrect=selectedAnswer===item.correcta;if(isCorrect)correctCount++;
  answerLog.push({pregunta:item.pregunta,opciones:[...item.opciones],seleccionada:selectedAnswer,correcta:item.correcta,acertada:isCorrect,explicacion:item.explicacion,unidad:item.unidad||selectedUnit});
  answerOptions.querySelectorAll(".answer-option").forEach((button,index)=>{button.disabled=true;if(index===item.correcta)button.classList.add("correct");else if(index===selectedAnswer)button.classList.add("incorrect");});
  answerFeedback.hidden=false;answerFeedback.className=`answer-feedback ${isCorrect?"feedback-correct":"feedback-incorrect"}`;
  const verdict=document.createElement("strong");verdict.textContent=isCorrect?"¡Correcto!":"No es correcto.";const explanation=document.createElement("p");
  explanation.textContent=isCorrect?item.explicacion:`La respuesta correcta es la ${String.fromCharCode(65+item.correcta)}. ${item.explicacion}`;answerFeedback.replaceChildren(verdict,explanation);
  scoreCounter.textContent=`Aciertos: ${correctCount}`;checkButton.hidden=true;nextButton.hidden=false;nextButton.textContent=currentQuestion===questions.length-1?"Ver resultado →":"Siguiente pregunta →";
  progressFill.style.width=`${(currentQuestion+1)/questions.length*100}%`;
}
function nextQuestion(){if(!answered)return;if(currentQuestion<questions.length-1){currentQuestion++;renderQuestion();}else showResults();}
function showResults(){
  questionCard.hidden=true;resultCard.hidden=false;const percentage=Math.round(correctCount/questions.length*100);const grade=(correctCount/questions.length*10).toFixed(1).replace(".",",");
  document.getElementById("result-score").textContent=`${grade} / 10`;
  document.getElementById("result-title").textContent=percentage>=90?"¡Excelente trabajo!":percentage>=70?"¡Muy bien!":percentage>=50?"¡Buen esfuerzo!":"¡Sigue practicando!";
  document.getElementById("result-message").textContent=`Has acertado ${correctCount} de ${questions.length} preguntas (${percentage}%). El resultado se ha guardado en el historial.`;
  document.getElementById("result-symbol").textContent=percentage>=70?"✿":"♡";questionCounter.textContent="EXAMEN FINALIZADO";scoreCounter.textContent=`${correctCount} / ${questions.length} aciertos`;progressFill.style.width="100%";
  const record={id:Date.now(),fecha:new Date().toISOString(),tipo:examType,titulo:examType==="combined"?unitInfo.all:unitInfo[selectedUnit],total:questions.length,aciertos:correctCount,nota:grade,respuestas:answerLog};
  const history=readHistory();history.unshift(record);saveHistory(history.slice(0,100));
  if(examType==="combined" && !questions.every(q=>q.id===undefined)){
    const seen=new Set(readSeenCombined());questions.forEach(q=>{if(q.id!==undefined)seen.add(q.id);});
    localStorage.setItem("combined-seen-ids",JSON.stringify(seen.size>=(window.bancoConjunto||[]).length?[]:[...seen]));
  }
}
function returnHome(){quizPanel.hidden=true;welcome.hidden=false;unitCards.hidden=false;helpStrip.hidden=false;document.getElementById("history-section").hidden=false;modePanel.hidden=true;selectedUnit=null;renderHistory();window.scrollTo({top:0,behavior:"smooth"});}
function renderHistory(){
  const history=readHistory(),list=document.getElementById("history-list");document.getElementById("history-count").textContent=`${history.length} ${history.length===1?"examen":"exámenes"}`;list.innerHTML="";
  if(!history.length){const empty=document.createElement("p");empty.className="history-empty";empty.textContent="Todavía no hay exámenes terminados. Cuando completes uno, aparecerá aquí tu nota y podrás revisar tus respuestas.";list.appendChild(empty);return;}
  history.forEach(record=>{const details=document.createElement("details");details.className="history-entry";const summary=document.createElement("summary");const left=document.createElement("span");left.className="history-summary-title";const date=new Date(record.fecha);
    left.textContent=`${record.titulo} · ${date.toLocaleDateString("es-ES")} ${date.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}`;const score=document.createElement("strong");score.className="history-grade";score.textContent=`${record.nota}/10`;summary.append(left,score);details.appendChild(summary);
    const meta=document.createElement("p");meta.className="history-meta";meta.textContent=`${record.aciertos} de ${record.total} respuestas correctas`;details.appendChild(meta);
    if(record.tipo==="combined" && Array.isArray(record.respuestas) && record.respuestas.length){
      const replayWrap=document.createElement("div");replayWrap.className="history-replay-wrap";
      const replayButton=document.createElement("button");replayButton.type="button";replayButton.className="secondary-button history-replay-button";
      replayButton.textContent="↻ Volver a hacer este mismo examen";
      replayButton.dataset.replayRecord=String(record.id);
      replayWrap.appendChild(replayButton);details.appendChild(replayWrap);
    }
    const answers=document.createElement("div");answers.className="history-answers";
    record.respuestas.forEach((answer,qIndex)=>{const item=document.createElement("article");item.className=`history-answer ${answer.acertada?"history-answer-correct":"history-answer-wrong"}`;const heading=document.createElement("h4");heading.textContent=`${qIndex+1}. ${answer.pregunta}`;
      const selected=document.createElement("p");selected.textContent=`Tu respuesta: ${String.fromCharCode(65+answer.seleccionada)}. ${answer.opciones[answer.seleccionada]}`;const correct=document.createElement("p");correct.textContent=`Respuesta correcta: ${String.fromCharCode(65+answer.correcta)}. ${answer.opciones[answer.correcta]}`;const explanation=document.createElement("p");explanation.className="history-explanation";explanation.textContent=answer.explicacion;item.append(heading,selected,correct,explanation);answers.appendChild(item);});details.appendChild(answers);list.appendChild(details);});
}
document.getElementById("history-list").addEventListener("click",event=>{
  const button=event.target.closest("[data-replay-record]");
  if(!button)return;
  event.preventDefault();event.stopPropagation();
  replayHistoryExam(button.dataset.replayRecord);
});
renderHistory();


// Navegación entre la zona de exámenes y la biblioteca audiovisual.
const viewTabs = document.querySelectorAll(".nav-tab");
const studyView = document.getElementById("study-view");
const videosView = document.getElementById("videos-view");
viewTabs.forEach(tab => tab.addEventListener("click", () => {
  const showVideos = tab.dataset.view === "videos-view";
  studyView.hidden = showVideos;
  videosView.hidden = !showVideos;
  viewTabs.forEach(item => item.classList.toggle("active", item === tab));
  window.scrollTo({ top: 0, behavior: "smooth" });
}));

// Añadiremos aquí los vídeos reales cuando se faciliten sus nombres y enlaces.
// Cada unidad puede tener cero, uno o varios vídeos. Las unidades vacías no se muestran.
window.videoLibrary = window.videoLibrary || {
  // La lección 1 queda pendiente de incorporar cuando se facilite la grabación.
  units: [
    {
      label: "CLASES AUDIOVISUALES",
      title: "El papel del auxiliar de medicina estética en tratamientos médicos",
      videos: [
        { title: "Lección 1. El papel de la auxiliar de medicina estética en tratamientos médicos", type: "drive", id: "12fydot79dtFkkabC1fZPgRLZiW9VUnF4" },
        { title: "Lección 2. El rol de la auxiliar de medicina estética en tratamiento de ácido hialurónico", type: "vimeo", id: "1187349137", hash: "8136627f79" },
        { title: "Lección 3. El rol de la auxiliar de medicina estética en tratamiento de mesoterapia", type: "vimeo", id: "1187721991", hash: "7c12f1210b" }
      ]
    },
    {
      label: "UNIDAD DIDÁCTICA 3",
      title: "Microblading y micropigmentación",
      videos: [
        { title: "Clase Audiovisual. Elaboración propia. Microblading y micropigmentación. Tips prácticos.", type: "vimeo", id: "875130314", hash: "f8161b943e" },
        { title: "Clase Audiovisual. Elaboración propia. Micropigmentación de labios", type: "vimeo", id: "1052246042", hash: "da016f2aa4" },
        { title: "Clase Audiovisual. Elaboración propia. Retoque Micropigmentación de labios", type: "vimeo", id: "1098520747", hash: "dd8f09d2fb" }
      ]
    },
    {
      label: "UNIDAD DIDÁCTICA 4",
      title: "Tratamientos corporales y aparatología",
      videos: [
        { title: "Clase Audiovisual. Elaboración propia. Protocolo de Presoterapia. Aplicaciones y beneficios.", type: "vimeo", id: "917128903", hash: "df2169f748" },
        { title: "Clase Audiovisual. Elaboración propia. Microdermoabrasión y microneedling.", type: "vimeo", id: "943985705", hash: "a3a8c87654" },
        { title: "Clase Audiovisual. Elaboración propia. Protocolo de Dermapen + Aquapure", type: "vimeo", id: "1213579834", hash: "04f06cbb74" },
        { title: "Clase Audiovisual. Elaboración propia. Cavitación.", type: "vimeo", id: "1050041831", hash: "faf6b715aa" },
        { title: "Clase Audiovisual. Elaboración propia. Protocolo de LPG", type: "vimeo", id: "1212042585", hash: "d2b53d059a" },
        { title: "Clase Audiovisual. Elaboración propia. Protocolo Ondas de Choque", type: "vimeo", id: "1214276361", hash: "3037cfd531" }
      ]
    },
    {
      label: "UNIDAD DIDÁCTICA 5",
      title: "Depilación láser",
      videos: [
        { title: "Clase Audiovisual. Elaboración propia. Depilación Laser. Tipos de láser y Protocolo.", type: "vimeo", id: "915566302", hash: "97e101e280" },
        { title: "Clase Audiovisual. Elaboración propia. Depilación Láser con IPL.", type: "vimeo", id: "1008787212", hash: "02b75f5f65" },
        { title: "Clase Audiovisual. Elaboración propia. Depilación Láser. Preguntas de Seguridad. Protocolo, Parámetros e Indicaciones.", type: "vimeo", id: "1211708763", hash: "313e80457d" }
      ]
    },
    {
      label: "UNIDAD DIDÁCTICA 7",
      title: "Higiene facial y peelings",
      videos: [
        { title: "Clase Audiovisual. Elaboración propia. Higiene facial y Peeling Químico. Protocolo profesional en cabina.", type: "vimeo", id: "915968462", hash: "1431f47bf1" },
        { title: "Clase Audiovisual. Elaboración propia. Hidraskin.", type: "vimeo", id: "944012060", hash: "834c2f5e95" },
        { title: "Clase Audiovisual. Elaboración propia. Peeling Enzimático.", type: "vimeo", id: "1173928251", hash: "4e0ef14f72" },
        { title: "Clase Audiovisual. Elaboración propia. Hollywood Peel (Carbon Peel). Protocolo práctico.", type: "vimeo", id: "1174367463", hash: "c64b781c7a" }
      ]
    },
    {
      label: "UNIDAD DIDÁCTICA 9",
      title: "Tratamientos médico-estéticos",
      videos: [
        { title: "Clase Audiovisual. Elaboración propia. HIFU. Procedimiento y mapa facial.", type: "vimeo", id: "875145989", hash: "d34919ceab" },
        { title: "Clase Audiovisual. Elaboración propia. Radiofrecuencia facial y corporal.", type: "vimeo", id: "938664848", hash: "dc81a128be" }
      ]
    }
  ],
  extras: [
    { title: "Vídeo 1. Todo sobre presoterapia", type: "youtube", id: "52gR0GPPdwU" },
    { title: "Vídeo 2. Ventajas de la Electrodepilación", type: "youtube", id: "4gaaZHQ2GOs" },
    { title: "Vídeo 3. Hirsutismo. Aumento del pelo corporal en mujeres. Causas, tratamiento", type: "youtube", id: "SX2WpXgm7q8" },
    { title: "Vídeo 4. ¿Qué es la hipertricosis? Causas. Consecuencias y soluciones", type: "youtube", id: "CcXXYxDCIPQ" },
    { title: "Vídeo 5. Tipos de celulitis", type: "youtube", id: "5qww_CpwsOs" },
    { title: "Vídeo 6. Cómo realizar una Limpieza Facial con Microdermoabrasión o Punta de Diamante", type: "youtube", id: "PI8Bb6PwQvg" },
    { title: "Vídeo 7. Peeling: ¿Qué es y que resultados tiene?", type: "youtube", id: "HSOZ4H3x_Uw" },
    { title: "Vídeo 8. Varices: ¿Qué son y por qué se producen?", type: "youtube", id: "i7PC5Pf4krQ" },
    { title: "Vídeo 9. Linfedema: ¿Qué es, causas y tratamiento? Método Godoy", type: "youtube", id: "Nkvqm2hsLkU" },
    { title: "Vídeo 10. Ultrasonidos estéticos", type: "youtube", id: "KNDOLhuU15M" },
    { title: "Vídeo 11. Radiofrecuencia. ¿Qué es y para qué sirve?", type: "youtube", id: "Yn7Cz9ulrZM" },
    { title: "Vídeo 12. ¿Qué es la mesoterapia virtual?", type: "youtube", id: "iceVuRlH-K8" },
    { title: "Vídeo 13. Diferencias entre Micropigmentación y Microblading", type: "youtube", id: "z2fQoTLGg5U" }
  ]
};

function renderVideoLibrary() {
  const unitContainer = document.getElementById("video-units");
  const extraContainer = document.getElementById("extra-videos");
  const units = (window.videoLibrary.units || []).filter(unit => Array.isArray(unit.videos) && unit.videos.length);
  const extras = window.videoLibrary.extras || [];
  document.getElementById("video-unit-count").textContent = units.length ? `${units.length} unidades con vídeos` : "Aún sin vídeos";
  document.getElementById("extra-video-count").textContent = `${extras.length} vídeos`;
  unitContainer.replaceChildren();

  if (!units.length) {
    const empty = document.createElement("div");
    empty.className = "video-empty";
    empty.innerHTML = '<span>✿</span><h3>Tu biblioteca está preparada</h3><p>Cuando incorporemos los enlaces y las grabaciones, aparecerán aquí las unidades que tengan vídeos. Las unidades sin contenido audiovisual no se mostrarán.</p>';
    unitContainer.appendChild(empty);
  } else {
    units.forEach(unit => {
      const card = document.createElement("article");
      card.className = "video-unit-card";
      const top = document.createElement("div");
      top.className = "video-unit-top";
      const label = document.createElement("span");
      label.className = "unit-number";
      label.textContent = unit.label;
      const count = document.createElement("span");
      count.className = "video-count";
      count.textContent = `${unit.videos.length} ${unit.videos.length === 1 ? "vídeo" : "vídeos"}`;
      top.append(label, count);
      const title = document.createElement("h3");
      title.textContent = unit.title;
      card.append(top, title);
      if (unit.pending) {
        const pending = document.createElement("p");
        pending.className = "video-pending-note";
        pending.textContent = unit.pending;
        card.appendChild(pending);
      }
      const list = document.createElement("div");
      list.className = "video-lesson-list";
      unit.videos.forEach(video => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "video-lesson";
        button.innerHTML = '<span class="lesson-play">▶</span><span class="lesson-title"></span><span class="lesson-arrow">→</span>';
        button.querySelector(".lesson-title").textContent = video.title;
        button.addEventListener("click", () => playCourseVideo(video, unit.title));
        list.appendChild(button);
      });
      card.appendChild(list);
      unitContainer.appendChild(card);
    });
  }

  extraContainer.replaceChildren();
  if (!extras.length) {
    const empty = document.createElement("div");
    empty.className = "video-empty compact";
    empty.innerHTML = '<span>▶</span><h3>Contenidos audiovisuales</h3><p>Aquí organizaremos los vídeos complementarios numerados del campus.</p>';
    extraContainer.appendChild(empty);
  } else {
    const list = document.createElement("div");
    list.className = "video-unit-card extra-list";
    extras.forEach(video => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "video-lesson";
      button.innerHTML = '<span class="lesson-play">▶</span><span class="lesson-title"></span><span class="lesson-arrow">→</span>';
      button.querySelector(".lesson-title").textContent = video.title;
      button.addEventListener("click", () => playCourseVideo(video, "Contenidos audiovisuales"));
      list.appendChild(button);
    });
    extraContainer.appendChild(list);
  }
}

function playCourseVideo(video, unitTitle) {
  const panel = document.getElementById("video-player-panel");
  const frame = document.getElementById("video-frame");
  frame.replaceChildren();
  document.getElementById("current-video-title").textContent = video.title;
  document.getElementById("current-video-unit").textContent = unitTitle;
  if (video.type === "local") {
    const player = document.createElement("video");
    player.controls = true;
    player.playsInline = true;
    player.src = video.src;
    frame.appendChild(player);
  } else if ((video.type === "vimeo" || video.type === "youtube" || video.type === "drive") && video.id) {
    const player = document.createElement("iframe");
    const url = video.type === "vimeo"
      ? new URL(`https://player.vimeo.com/video/${encodeURIComponent(video.id)}`)
      : video.type === "youtube"
        ? new URL(`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}`)
        : new URL(`https://drive.google.com/file/d/${encodeURIComponent(video.id)}/preview`);
    if (video.type === "vimeo" && video.hash) url.searchParams.set("h", video.hash);
    player.src = url.toString();
    player.title = video.title;
    player.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
    player.allowFullscreen = true;
    player.referrerPolicy = "strict-origin-when-cross-origin";
    frame.appendChild(player);
  } else {
    frame.textContent = "Este vídeo todavía no tiene una fuente configurada.";
  }
  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}
document.getElementById("close-video").addEventListener("click", () => {
  document.getElementById("video-player-panel").hidden = true;
  document.getElementById("video-frame").replaceChildren();
});
renderVideoLibrary();
