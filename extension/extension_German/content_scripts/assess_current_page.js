window.browser = (function() {
    return window.msBrowser || window.browser || chrome;
  })();

window.browser.runtime.onMessage.addListener(handleMessaging);

currentUrl = window.location.hostname;
console.log(currentUrl);

window.browser.runtime.sendMessage({"message": "new_page",
                                    "domain": currentUrl,
                                    "url": window.location.href});

function handleMessaging(msg, sender, sendResponse){
  if (msg.message == "nudge_for_modal"){
    let nudgeForModal = msg.nudge;
    if (nudgeForModal != undefined){
      displayNudgeModal(nudgeForModal);
    }
    //console.log("nudge modal", nudgeForModal);
    try{
    sendResponse({response: "nudge_modal_displayed" })
    }catch(error){
      console.log(error);
      return Promise.resolve({response: "nudge_modal_displayed"});
    }
    return true;
  } else if (msg.message == "boost_for_modal"){
    let boostForModal = msg.boost;
    if (boostForModal != undefined){
      displayBoostModal(boostForModal);
    }
    //console.log("boost modal", boostForModal);
    try{
     sendResponse({response: "boost_modal_displayed"});
    }catch (error){
      return Promise.resolve({response: "boost_modal_displayed"});
    }
    return true;
  }else {
  //  console.log(msg);
  }
  return true;
}


function displayNudgeModal(nudge_for_modal){
    let explanation = nudge_for_modal.explanation
    if(document.getElementById("nudgeModal")!=null){
      let nudge = document.getElementById("nudgeModal");
      populateNudgeModal(nudge,
        explanation,
        nudge_for_modal.study,
        nudge_for_modal.date,
        nudge_for_modal.isSmallBad,
        nudge_for_modal.value,
        nudge_for_modal.betterHeader1,
        nudge_for_modal.betterHeader2);
    }else{
      fetch(browser.runtime.getURL('Update/update_nudge.html'))
        .then(response => response.text())
        .then(data => {
            div = document.createElement('div');
            div.innerHTML = data.trim();
            document.body.insertAdjacentElement("beforeend", div);
            let nudge = document.getElementById("nudgeModal");
            populateNudgeModal(nudge,
              explanation,
              nudge_for_modal.study, nudge_for_modal.date,
              nudge_for_modal.isSmallBad, nudge_for_modal.value,
              nudge_for_modal.betterHeader1,
              nudge_for_modal.betterHeader2);

        }).catch(err => {
          console.log(err);

        });
    }

}


function displayBoostModal(boostForModal){
    let text = boostForModal;
    if(document.getElementById("boostModal")!=null){
      let boost = document.getElementById("boostModal");
      populateBoostModal(boost, text);
    }else{
      fetch(browser.runtime.getURL('Update/update_boost.html'))
        .then(response => response.text())
        .then(data => {
            div = document.createElement('div');
            div.innerHTML = data.trim();
            document.body.insertAdjacentElement("beforeend", div);
            let boost = document.getElementById("boostModal");
            populateBoostModal(boost, text);

        }).catch(err => {
            alert(err);
        });
    }
}

function populateBoostModal(boost, boost_explanation){
  boost.style.display = "block";
  let startTime = new Date()
  let logo = document.getElementById("cpp_logo");
  logo.src = browser.runtime.getURL("icons/symbol_128.png");
  let explanation = document.getElementById("displayBoostText");
  explanation.innerHTML = boost_explanation;
  let closeButton = document.getElementById("closeModal");
  closeButton.addEventListener("click", function(){
     boost.style.display = "none";
     //console.log("closing boost");
     window.browser.runtime.sendMessage({
        message: "boost_closed",
        boost: boost_explanation,
        start_boost: startTime,
        end_boost: new Date()
    }, function(response) {
      //console.log('sendResponse was called with: ' + response);
    });
  });
}


function populateNudgeModal(nudge, nudge_explanation, study, date, isSmallBad, nudge_value, betterHeader1, betterHeader2){
  nudge.style.display = "block";
  let startTime = new Date();
  let possWidthForCanvas = document.getElementsByClassName("modal-body-cpp")[0].offsetWidth;
  let logo = document.getElementById("cpp_logo");
  let explanation = document.getElementById("measurementDescription");
  let studyDescription = document.getElementById("study_description");
  let dateDescription = document.getElementById("date_description");
  let dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric' }
  logo.src = browser.runtime.getURL("icons/symbol_128.png");
  explanation.innerHTML = nudge_explanation;
  let studyStartDate = new Date(study.start_date);
  studyStartDate = studyStartDate.toLocaleDateString('de-DE', dateOptions);
  let studyEndDate = new Date(study.end_date);
  studyEndDate = studyEndDate.toLocaleDateString('de-DE', dateOptions);
  let dateDate = new Date(date.for_date);
  dateDate = dateDate.toLocaleDateString('de-DE', dateOptions)
  studyDescription.innerHTML = study.header.concat(" von ", studyStartDate, " bis ", studyEndDate);
  dateDescription.innerHTML = date.header.concat(dateDate);

  if (study.avg_total != null && study.min_total != null && study.max_total != null){
    let betterThanStudy = document.getElementById("study_better");

    if(study.own_value != null){
      let studyPercent = Math.round(study.better_than_percent * 100);
      betterThanStudy.innerHTML = betterHeader1.concat(studyPercent, betterHeader2);
    } else{
      betterThanStudy.innerHTML = "Für Sie sind keine Daten für diesen Zeitraum verfügbar";
    }
  }

  if (date.avg_total != null && date.min_total != null && date.max_total != null){
    let betterThanDate = document.getElementById("date_better");

    if(date.own_value != null){
      let datePercent = Math.round(date.better_than_percent * 100);
      betterThanDate.innerHTML = betterHeader1.concat(datePercent, betterHeader2);
    }else{
      betterThanDate.innerHTML = "Für Sie sind keine Daten für diesen Zeitraum verfügbar";
    }
  }

  drawVisualizationForNudge("alertCanvas_study", possWidthForCanvas, study.min_total, study.max_total, study.avg_total, study.own_value, isSmallBad);
  drawVisualizationForNudge("alertCanvas_date", possWidthForCanvas, date.min_total, date.max_total, date.avg_total, date.own_value, isSmallBad);
  let closeButton = document.getElementById("closeModal");
  closeButton.addEventListener("click", function(){
     nudge.style.display = "none";
     window.browser.runtime.sendMessage({
       message: "nudge_closed",
       nudge: nudge_value,
       start_nudge: startTime,
       end_nudge: new Date()
    }, function(response) {  //console.log('sendResponse was called with: ' + response);
    });
  });
}



function drawVisualizationForNudge(canvasId, canvasWidth, min, max, avg, you, isSmallBad){
  var canvas = document.getElementById(canvasId);
  canvas.width = canvasWidth
  let canvasHeight = 100;
  let sidespace = 30;
  let textHeight = 20;
  //console.log(c);
  var con = canvas.getContext("2d");

  if (avg == null || min == null || max == null){
    con.fillStyle= "#000000";
    if (canvasWidth <400){
      con.font = "15px Arial";
    }else{
      con.font = "20px Arial";
    }
    con.textAlign = "center";
    con.fillText("Keine Daten für diesen Zeitraum verfügbar", canvasWidth/2, canvasHeight/2 - textHeight);
  }else{

    let barHeight = 20;
    let barUpperY = 50;

    let textAbove = 10;

    let barWidth = canvasWidth-(2*sidespace);
    let tickWidth = barWidth / (max - min);
    let avgLocationX = sidespace + ((avg-min) * tickWidth);
    let youLocationX = undefined;
    if (you !=  null){
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

      //mouth sad right
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

    if (youLocationX != undefined){
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
}
