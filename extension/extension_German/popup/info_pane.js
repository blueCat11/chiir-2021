(function() {
  /**
   * Check and set a global guard variable.
   * If this content script is injected into the same page again,
   * it will do nothing next time.
   */
  if (window.hasRun) {
    return;
  }
  window.hasRun = true;

  window.browser = (function() {
    return window.msBrowser || window.browser || window.chrome;
  })();

var condition = "";
window.browser.storage.local.get(["participant"],
    function(participant){
      document.getElementById("participant_label").innerHTML = participant.participant.label;
      condition = participant.participant.condition;

    }
  )


  let popupPort = browser.runtime.connect({name:"port-from-info-pane"});
  popupPort.postMessage({message: "popup-open",
                      startTime: new Date()});
  popupPort.onMessage.addListener(function(msg) {

    if (msg.message == "boost_update"){
      hideNoConditionPhrases();
      deleteEarlierInterventions();
      displayBoostsInBrowserAction(msg.new_boosts);
    }else if(msg.message == "nudge_update"){
      hideNoConditionPhrases();
      //console.log("nudges updates in popup?");
      deleteEarlierInterventions();
      displayNudgesInBrowserAction(msg.new_nudges);
    }else if (msg.message == "display_boost_explanation"){
      displayBoostExplanations();
      popupPort.postMessage({message:"explanation_displayed"});
    }else if (msg.message == "display_nudge_explanation"){
      displayNudgeExplanations();
      popupPort.postMessage({message:"explanation_displayed"});
    } else if(msg.message == "no_intervention"){
      deleteEarlierInterventions();

    } else if (msg.message == "end_of_study"){
      document.getElementById("endOfStudy").classList.remove("hidden");
    }else if (msg.message == "participation_code"){
      document.getElementById("participation_code_area").classList.remove("hidden");
      let participationCode = document.getElementById("participation_code");
      participationCode.innerHTML = msg.participation_code;
      popupPort.postMessage({message:"participation_code_displayed"});
    }else if (msg.message == "show_all_information"){
      let toHide = document.getElementById("finalize_participation");
      toHide.classList.add("hidden");
      hideNoConditionPhrases();
      displayNudgeExplanations();
      document.getElementById("end_of_study_info").classList.remove("hidden");
      deleteEarlierInterventions();
      displayBoostsInBrowserAction(msg.new_boosts);
      displayNudgesInBrowserAction(msg.new_nudges);
    }else{
      //console.log("In popup script, received message from background script: ");
      //console.log(msg);
    }
  });


  let codeSendButton = document.getElementById("code_send_button");
  codeSendButton.addEventListener("click", function() {
    let code = document.getElementById("last_survey_code").value;
    if (code == "Grashüpfer"){
      popupPort.postMessage({message:"get_participation_code"});
      let toHide = document.getElementById("finalize_participation");
      toHide.classList.add("hidden");
    }else{
      document.getElementById("errorMessage").innerHTML = "Das ist leider nicht der korrekte Code.";
    }

  });


function displayBoostExplanations(){
  cookiesExplanation = document.getElementById("cookies_explanation");
  thirdPartyExplanation = document.getElementById("third_party_request_explanation");
  cookiesExplanation.classList.remove("hidden");
  thirdPartyExplanation.classList.remove("hidden");
}

function displayNudgeExplanations(){
  displayBoostExplanations();
  privacyPointsExplanation = document.getElementById("privacy_points_explanation");
  privacyPointsExplanation.classList.remove("hidden");
}

function hideNoConditionPhrases(){
  toBeHidden = document.getElementById("placeholder_while_no_data");
  toBeHidden.classList.add("hidden");

  toBeShown = document.getElementById("hide_while_no_data");
  toBeShown.classList.remove("hidden");
}

function showNoConditionPhrases(){
  document.getElementById("placeholder_while_no_data").classList.remove("hidden");
  document.getElementById("hide_while_no_data").classList.add("hidden");
}

function displayBoostsInBrowserAction(boosts){
  let updateHeading = document.getElementById("shown_with_updates");
  updateHeading.classList.remove("hidden");
  let containerForBoosts = document.getElementById("updates_go_here");
  containerForBoosts.classList.remove("hidden");
  for(let i = 0; i < boosts.length; i++){
    let outsideDiv = document.createElement("DIV");
    outsideDiv.classList.add("uk-card");
    outsideDiv.classList.add("uk-card-default");
    outsideDiv.classList.add("uk-card-body");
    let boostP = document.createElement("P");
    boostP.innerHTML = boosts[i];
    outsideDiv.appendChild(boostP);
    containerForBoosts.appendChild(outsideDiv);
  }
}

function deleteEarlierInterventions(){
  let containerForBoosts = document.getElementById("updates_go_here");
  while (containerForBoosts.hasChildNodes()) {
    containerForBoosts.removeChild(containerForBoosts.firstChild);
  }
}


function displayNudgesInBrowserAction(nudges){
  let updateHeading = document.getElementById("shown_with_updates");
  updateHeading.classList.remove("hidden");
  let containerForNudges = document.getElementById("updates_go_here");
  containerForNudges.classList.remove("hidden");
  for(let i = 0; i < nudges.length; i++){
    currentNudgeInfo = nudges[i];
    let study = currentNudgeInfo.study;
    let date = currentNudgeInfo.date;
    let possWidthForCanvas = 300;
    let dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
    let outsideDiv = document.createElement("DIV");
    outsideDiv.classList.add("uk-card");
    outsideDiv.classList.add("uk-card-default");
    outsideDiv.classList.add("uk-card-body");

    let measurementDescription = document.createElement("P");
    measurementDescription.classList.add("measurementDescription");
    measurementDescription.classList.add("title");
    measurementDescription.innerHTML = currentNudgeInfo.explanation;
    outsideDiv.appendChild(measurementDescription);

    let studyDescription = document.createElement("P");
    studyDescription.classList.add("time_description");
    let studyStartDate = new Date(study.start_date);
    studyStartDate = studyStartDate.toLocaleDateString('de-DE', dateOptions);
    let studyEndDate = new Date(study.end_date);
    studyEndDate = studyEndDate.toLocaleDateString('de-DE', dateOptions);
    studyDescription.innerHTML = study.header.concat(" von ", studyStartDate, " bis ", studyEndDate);
    outsideDiv.appendChild(studyDescription);

    let betterThanStudy = document.createElement("P");
    betterThanStudy.classList.add("betterThanText");

    let studyCanvas = document.createElement("CANVAS");
    studyCanvas.setAttribute("height", 150);
    studyCanvas.setAttribute("width", 300);
    studyCanvas = drawVisualizationForNudge(studyCanvas, study.min_total, study.max_total, study.avg_total, study.own_value, currentNudgeInfo.isSmallBad);
    if (studyCanvas == -1){
      studyCanvas = document.createElement("P");
      studyCanvas.innerHTML = "Keine Daten für diesen Zeitraum verfügbar";
    } else{

      if(study.own_value == null){
        betterThanStudy.innerHTML = "Für Sie sind keine Daten für diesen Zeitraum verfügbar";
      }else{
        let studyPercent = Math.round(study.better_than_percent * 100);
        betterThanStudy.innerHTML = currentNudgeInfo.betterHeader1.concat(studyPercent, currentNudgeInfo.betterHeader2);
      }
    }
    outsideDiv.appendChild(studyCanvas);

    outsideDiv.appendChild(betterThanStudy);

    let dateDescription = document.createElement("P");
    dateDescription.classList.add("time_description");
    let dateDate = new Date(date.for_date);
    dateDate = dateDate.toLocaleDateString('de-DE', dateOptions)
    dateDescription.innerHTML = date.header.concat(dateDate);
    outsideDiv.appendChild(dateDescription);

    let betterThanDate = document.createElement("P");
    betterThanDate.classList.add("betterThanText");

    let dateCanvas = document.createElement("CANVAS");
    dateCanvas.setAttribute("height", 150);
    dateCanvas.setAttribute("width", 300);
    dateCanvas = drawVisualizationForNudge(dateCanvas, date.min_total, date.max_total, date.avg_total, date.own_value, currentNudgeInfo.isSmallBad);
    if (dateCanvas == -1){
      dateCanvas = document.createElement("P");
      dateCanvas.innerHTML = "Keine Daten für diesen Zeitraum verfügbar";
    }else{
      if(date.own_value == null){
        betterThanDate.innerHTML = "Für Sie sind keine Daten für diesen Zeitraum verfügbar";
      }else{
        let datePercent = Math.round(date.better_than_percent * 100);
        betterThanDate.innerHTML = currentNudgeInfo.betterHeader1.concat(datePercent, currentNudgeInfo.betterHeader2);
      }
    }
    outsideDiv.appendChild(dateCanvas);

    outsideDiv.appendChild(betterThanDate);

    containerForNudges.appendChild(outsideDiv);
  }
}

// Be careful when accessing condition, since

function drawVisualizationForNudge(canvas, min, max, avg, you, isSmallBad){
  //console.log(c);
  var con = canvas.getContext("2d");

  let canvasWidth = canvas.width;
  let canvasHeight = canvas.height;
  let sidespace = 30;

  let textHeight = 20;
  //console.log(c);
  var con = canvas.getContext("2d");

  if (avg == null || min == null || max == null){
    con.fillStyle= "#000000";
    con.font = "18px Arial";
    con.textAlign = "center";
    canvas.height = 0;
    con.fillText("Keine Daten für diesen Zeitraum verfügbar", sidespace, canvasHeight/2 - textHeight);
    return -1;
  }else{

    let barHeight = 20;
    let barUpperY = 50;
    let textAbove = 10;

    let barWidth = canvasWidth-(2*sidespace);
    let tickWidth = barWidth / (max - min);
    let avgLocationX = sidespace + ((avg-min) * tickWidth);

    let youLocationX = undefined;
    if (you != null){
      youLocationX = sidespace + ((you-min) * tickWidth);
    }

    //build a linear gradient
    lGrad = con.createLinearGradient(0,0,canvasWidth,0);
    if(isSmallBad){
      lGrad.addColorStop(0, "#FF0000");
      lGrad.addColorStop(1, "#00FF00");

      //mouth sad left
      con.strokeStyle= "black";
      con.beginPath();
      con.arc(sidespace - (0.5*sidespace), barUpperY+(barHeight)-3, 4, 1.15*Math.PI, 1.85*Math.PI, false);
      con.stroke();

      //mouth happy right
      con.strokeStyle= "black";
      con.beginPath();
      con.arc(canvasWidth - (0.5*sidespace), barUpperY+(barHeight/2)+1, 4, 0.15*Math.PI, 0.85*Math.PI, false);
      con.stroke();
    }else{
      lGrad.addColorStop(0, "#00FF00");
      lGrad.addColorStop(1, "#FF0000");

      con.strokeStyle= "black";
      con.beginPath();
      con.arc(canvasWidth - (0.5*sidespace), barUpperY+(barHeight)-3, 4, 1.15*Math.PI, 1.85*Math.PI, false);
      con.stroke();

      //mouth happy left
      con.strokeStyle= "black";
      con.beginPath();
      con.arc(sidespace - (0.5*sidespace), barUpperY+(barHeight/2)+1, 4, 0.15*Math.PI, 0.85*Math.PI, false);
      con.stroke();
    }
    con.fillStyle = lGrad;
    con.fillRect(sidespace, barUpperY, barWidth, barHeight);

    con.fillStyle= "#000000";
    con.font = "15px Arial";
    con.textAlign = "center";
    con.fillText(min.toString(), sidespace, barUpperY+barHeight+textHeight);
    con.fillText(max.toString(), canvasWidth-sidespace, barUpperY+barHeight+textHeight);

    con.strokeStyle = "#000000";

    if(youLocationX != undefined){
      con.moveTo(youLocationX,barUpperY);
      con.lineTo(youLocationX,barUpperY+barHeight);
      con.stroke();
      con.fillText("Sie", youLocationX, barUpperY-textAbove)
    }

    con.moveTo(avgLocationX, barUpperY);
    con.lineTo(avgLocationX, barUpperY+barHeight);
    con.stroke();
    con.fillText("Durchschnitt", avgLocationX, barUpperY+barHeight+textHeight)

    //face left
    con.beginPath();
    con.arc(sidespace-(0.5*sidespace), barUpperY+(barHeight/2), barHeight/2, 0, 2 * Math.PI);
    con.stroke();

    //eyes left
    con.fillStyle = "black";
    con.beginPath();
    con.arc(sidespace-(0.5*sidespace)+3, barUpperY+(barHeight/2)-2, 1, 0, 2 * Math.PI);
    con.fill();

    con.beginPath();
    con.arc(sidespace-(0.5*sidespace)-3, barUpperY+(barHeight/2)-2, 1, 0, 2 * Math.PI);
    con.fill();

    //face right
    con.beginPath();
    con.arc(canvasWidth-(0.5*sidespace), barUpperY+(barHeight/2), barHeight/2, 0, 2 * Math.PI);
    con.stroke();

    //eyes right
    con.beginPath();
    con.arc(canvasWidth-(0.5*sidespace)+3, barUpperY+(barHeight/2)-2, 1, 0, 2 * Math.PI);
    con.fill();

    con.beginPath();
    con.arc(canvasWidth-(0.5*sidespace)-3, barUpperY+(barHeight/2)-2, 1, 0, 2 * Math.PI);
    con.fill();

  }
  return canvas;

}

})();
