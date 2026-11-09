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
