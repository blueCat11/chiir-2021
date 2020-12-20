window.browser = (function() {
    return window.msBrowser || window.browser || window.chrome;
  })();

// TODO change with own data
let baseApiAddress = 'protocol://host/api'

let participantIdForExtension = undefined;
let conditionForExtension = undefined;

browser.storage.local.get(["participant"], function(result){
  if (result != undefined && !isEmptyObject(result)){
    //console.log(result);
    console.log("participant", result);
    conditionForExtension = result.participant.condition;
    participantIdForExtension = result.participant.id;
}else{
  console.log("not yet saved");
}
})

//Dates relevant for the run-through of the study


//the date when the last intervention was shown, starts with before the study, but is updated to check whether a new information can be displayed to participantIdForExtension
//this should be set to a date before the study begins
let previousInterventionDate = new Date(2020, 4, 1); //current data are 2020-May-1 (months start with 0)
browser.storage.local.get(["previousInterventionDate"], function(result){
  if (result != undefined && !isEmptyObject(result)){
    console.log(result);
    previousInterventionDate = result.previousInterventionDate;
  }else{
    console.log("not yet saved");
  }
});


// TODO change with own data (for all the following dates)
let interventionStartDate = new Date(2020, 10, 1); // this is when the people in boost- and nudge-groups will start seeing extra information
let studyStartDate = new Date(2020, 4, 25) // current data 2020-May-25
let interventionEndDate = new Date(2020, 11, 1) // this is when the people in boost and nudge groups don't get shown any more info
let studyEndDate = new Date(2020, 11, 1 ) // on this date, the participants are prompted to fill out questionnaires and are then shown all data
let lastPopUpStartTime = new Date(2020, 1,1); //when the popup was last opened, this variable is used to track the time the browser-action popup is open


let lastSaveWebsitesDate = studyStartDate;

browser.storage.local.get(["lastSaveWebsitesDate"], function(result){
  if (result != undefined && !isEmptyObject(result)){
    console.log(result);
    lastSaveWebsitesDate = result.lastSaveWebsitesDate;
  }else{
    console.log("not yet saved");
  }
});

let current_domain = "";
let isPopupUpToDate = false; // gets set to true after the info has been updated at the beginning of a new day
let isExplanationDisplayed = false; // gets set to true after the explantions in the browser action popup are displayed
let isAllQuestionnairesFilledOut = false; // gets set to true, after the participant has requested a participation code (means that all questionnaires have been filled out)
let isAllInfoShown = false; // gets set to true after the participant gets displayed their full study info

browser.storage.local.get(["isPopupUpToDate"], function(result){
  if (result != undefined && !isEmptyObject(result)){
    console.log(result);
    isPopupUpToDate = result.isPopupUpToDate;
  }else{
    console.log("not yet saved");
  }
});

browser.storage.local.get(["isAllQuestionnairesFilledOut"], function(result){
  if (result != undefined && !isEmptyObject(result)){
    console.log(result);
    isAllQuestionnairesFilledOut = result.isAllQuestionnairesFilledOut;
  }else{
    console.log("not yet saved");
  }
});

browser.storage.local.get(["isAllInfoShown"], function(result){
  if (result != undefined && !isEmptyObject(result)){
    console.log(result);
    isAllInfoShown = result.isAllInfoShown;
  }else{
    console.log("not yet saved");
  }
});


let study_header = "During the whole study duration: ";
let date_header = "During the last full day: ";
let better_header_1 = "That means your browsing behavior is more private than that of ";
let better_header_2 = "% of other participants";


let isChrome = false;
let isFirefox = false;

browser.storage.local.get(["browserType"], function(result){
  if (result != undefined && !isEmptyObject(result)){
    console.log(result);
    isChrome = result.browserType.isChrome;
    isFirefox = result.browserType.isFirefox;
  }else {
    console.log("not yet saved");
  }
});

// variables concerning boosts and nudges
let currentlyUsedBoosts = [] // the first one is the top most shown one, so if you want to show a new one, add it in the front
let totalBoosts = [
  "Entertainment websites have more cookies and third parties per page than most other kinds of websites.",
  "Education websites have less cookies and third parties per page than most other kinds of websites.",
  "Blocking third party cookies in the browser settings leads to a reduction of the number of third parties per page by about 30\%.",
  "By using private browsing (Firefox) or incognito mode (Chrome), cookies are deleted automatically after the browser is closed.",
  "By using an adblocker, the number of third parties per page is reduced by 40\%, even without changing the blocker settings."
]; // used to copy to the sampling pot, after its empty
let samplingPotBoosts = [
  "Entertainment websites have more cookies and third parties per page than most other kinds of websites.",
  "Education websites have less cookies and third parties per page than most other kinds of websites.",
  "Blocking third party cookies in the browser settings leads to a reduction of the number of third parties per page by about 30\%.",
  "By using private browsing (Firefox) or incognito mode (Chrome), cookies are deleted automatically after the browser is closed.",
  "By using an adblocker, the number of third parties per page is reduced by 40\%, even without changing the blocker settings."
];
let isFullBoostSampleUsed = false; // gets set to true after all boosts have been used at least once
let boostForModal = undefined;

browser.storage.local.get(["boosts"], function(result){
  if (result != undefined && !isEmptyObject(result)){
    console.log(result);
    currentlyUsedBoosts = result.boosts.currentlyUsedBoosts;
    samplingPotBoosts = result.boosts.samplingPotBoosts;
    isFullBoostSampleUsed = result.boosts.isFullBoostSampleUsed;
  }else{
    console.log("not yet saved");
  }
});

let currentlyUsedNudges = [];
let totalNudges = [
  {value: "PrivacyPoints_Total",
  explanation: "Average of total achieved privacy points per visited site",
  isSmallBad: true
  },
  {value: "PrivacyPoints_SettingChange",
  explanation: "Number of privacy points achieved through browser settings (average per visited site)",
  isSmallBad: true
  },
  {value: "PrivacyPoints_WebsiteVisits",
  explanation: "Number of privacy points achieved through website visits (average per visited site) ",
  isSmallBad: true
  },
  {value: "Num3rdPartyRequests",
  explanation: "Average number of third party requests per visited site",
  isSmallBad: false
  },
  {value: "NumCookies",
  explanation: "Average number of added cookies per visited site",
  isSmallBad: false
  }
]; // used to copy to the samplling pot after it's empty
let samplingPotNudges = [
  {value: "PrivacyPoints_Total",
  explanation: "Average of total achieved privacy points per visited site",
  isSmallBad: true
  },
  {value: "PrivacyPoints_SettingChange",
  explanation: "Number of privacy points achieved through browser settings (average per visited site)",
  isSmallBad: true
  },
  {value: "PrivacyPoints_WebsiteVisits",
  explanation: "Number of privacy points achieved through website visits (average per visited site) ",
  isSmallBad: true
  },
  {value: "Num3rdPartyRequests",
  explanation: "Average number of third party requests per visited site",
  isSmallBad: false
  },
  {value: "NumCookies",
  explanation: "Average number of added cookies per visited site",
  isSmallBad: false
  }
];
let isFullNudgeSampleUsed = false; // gets set to true once all nudges have been used at least once
let nudgeForModal = undefined;

browser.storage.local.get(["nudges"], function(result){
  if (result != undefined && !isEmptyObject(result)){
    console.log(result);
    currentlyUsedNudges = result.nudges.currentlyUsedNudges;
    samplingPotNudges = result.nudges.samplingPotNudges;
    isFullNudgeSampleUsed = result.nudges.isFullNudgeSampleUsed;
  }else{
    console.log("not yet saved");
  }
});

// end of study information for display in popup
let userParticipationCode = undefined;
let endOfStudyNudges = undefined;

browser.storage.local.get(["endOfStudyNudges"], function(result){
  if (result != undefined && !isEmptyObject(result)){
    endOfStudyNudges = result.endOfStudyNudges;
  }else{
    console.log("not yet saved");
  }
})

browser.storage.local.get(["userParticipationCode"], function(result){
  if (result != undefined && !isEmptyObject(result)){
    userParticipationCode = result.userParticipationCode;
  }else{
    console.log("not yet saved");
  }
});


window.browser.runtime.onInstalled.addListener(setUpExtensionAndGetCondition);
window.browser.runtime.onMessage.addListener(handleMessaging);
// listen for each HTTP response
browser.webRequest.onResponseStarted.addListener(
  this.sendThirdParty,
  {urls: ['<all_urls>']});
// listen for tab updates
browser.tabs.onUpdated.addListener(this.sendFirstParty);

browser.runtime.onConnect.addListener(function(port) {
  if (port.name == "port-from-info-pane"){
    port.postMessage({
      message: "boost_update",
      new_boosts: currentlyUsedBoosts});

    port.onMessage.addListener(function(msg) {

      if (msg.message == "popup-open"){
        lastPopUpStartTime = msg.startTime;
        let now = new Date()
          //if(now >= interventionStartDate && now < interventionEndDate){
          if(true){
            //console.log("intervention!")
            if(conditionForExtension.includes("boost")){
              port.postMessage({
                message: "display_boost_explanation"
              })
              //if (!isPopupUpToDate){
              if(true){
                  port.postMessage({
                    message: "boost_update",
                    new_boosts: currentlyUsedBoosts});
              }
            }else if(conditionForExtension.includes("nudge")){
              port.postMessage({
                message: "display_nudge_explanation"
              })
              //if(!isPopupUpToDate){
              if(true){
                  port.postMessage({
                    message: "nudge_update",
                    new_nudges: currentlyUsedNudges
                  });
              }else{
                //console.log("sidebar up to date");
              }
            }
          }else if (now >= interventionEndDate && now < studyEndDate){
            port.postMessage({message:"no_intervention"});
          }else if (now >= studyEndDate){
            port.postMessage({message:"end_of_study"});
          }
          if(isAllQuestionnairesFilledOut == true && isAllInfoShown == false){
            getAndShowTotalInfoForEndOfStudy(port);
            isAllInfoShown = true;
            saveIsAllInfoShownToLocalStorage(isAllInfoShown);

          } else if (isAllQuestionnairesFilledOut== true && isAllInfoShown == true){

            saveEndOfStudyNudgesToLocalStorage(endOfStudyNudges);
            //console.log(endOfStudyNudges);

            port.postMessage({
              message: "show_all_information",
              new_boosts: totalBoosts,
              new_nudges: endOfStudyNudges
            });
            port.postMessage({
              message: "participation_code",
              participation_code: userParticipationCode
            });
          }
      } else if (msg.message == "popup-updated"){
        isPopupUpToDate = true;
        saveIsPopupUpToDateToLocalStorage(isPopupUpToDate);
      } else if (msg.message == "explanation_displayed"){
        isExplanationDisplayed = true;
      } else if (msg.message == "get_participation_code"){
        fetch(baseApiAddress.concat('/participation_code/'))
        .then(response => {
          return response.json();
        })
        .then(participationCode => {
          //console.log(participationCode);
          userParticipationCode = participationCode.participation_code;
          port.postMessage({
            message: "participation_code",
            participation_code: userParticipationCode
          });
          saveUserParticipationCodeToLocalStorage(userParticipationCode);
        });
      } else if (msg.message == "participation_code_displayed"){
        isAllQuestionnairesFilledOut = true;
        saveIsAllQuestionnairesFilledOutToLocalStorage(isAllQuestionnairesFilledOut);
        if(isAllQuestionnairesFilledOut == true && isAllInfoShown == false){
          getAndShowTotalInfoForEndOfStudy(port);
          isAllInfoShown = true;
          saveIsAllInfoShownToLocalStorage(isAllInfoShown);

        }
      }
    });

    port.onDisconnect.addListener(function(port){
      if(port.name== "port-from-info-pane"){
        let endTime = new Date();
        //console.log("popup closed at", endTime);
        let currentPopUpSession = {
            participant: participantIdForExtension,
            popup_opened_time: lastPopUpStartTime,
            popup_closed_time: endTime
        }
        let apiEndPointForPopUpSessions = baseApiAddress.concat('/popup_sessions/');
        fetch(apiEndPointForPopUpSessions, {
           method: 'POST',
           headers: {
               'Content-Type': 'application/json'
           },
           body: JSON.stringify(currentPopUpSession)
         })
         .then((response) => response.json())
         .then((data) => console.log(data))

      }
    })

  }
});


function getAndShowTotalInfoForEndOfStudy(port){
  let nudgeApiAddress2 = baseApiAddress.concat('/study_nudges/?participant_id=', participantIdForExtension)
  fetch(nudgeApiAddress2)
  .then(response => {
    return response.json();
  })
  .then(nudgesForParticipant => {
    let currentlyUsedNudgesReplacement = [];
    for(let i = 0; i < totalNudges.length; i++){
      let nudgeForList = prepareNudgeForPopUp(totalNudges[i], nudgesForParticipant.nudges);
      currentlyUsedNudgesReplacement.push(nudgeForList)
    }
    endOfStudyNudges = currentlyUsedNudgesReplacement
    saveEndOfStudyNudgesToLocalStorage(currentlyUsedNudgesReplacement);
    port.postMessage({
      message: "show_all_information",
      new_boosts: totalBoosts,
      new_nudges: endOfStudyNudges
    });

  }).catch(function(error){
    console.log(error);
  });
}


//setUpExtensionAndGetCondition
/* check why callback was invoked
*see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onInstalled
* and only use method when reason = "install"
* see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/OnInstalledReason
*/
function setUpExtensionAndGetCondition(details){
  // only run if extension was just installed or updated (not on browser updates)

  if(details.reason == "install" | details.reason == "update") {
    //console.log("installed");
    let participantLabel = getRandomArbitrary(1000, 9999);

    // GET
    fetch(baseApiAddress.concat('/random_participant'))
    .then(response => {
      return response.json();
    })
    .then(randomParticipant => {
        participantLabel = Number(
          String(participantLabel).concat(String(randomParticipant.participant_id)));
        randomParticipant.participant_label = participantLabel;
        participantIdForExtension = randomParticipant.participant_id;
        //console.log(randomParticipant);
        //console.log(randomParticipant.condition.condition_name);
        conditionForExtension = randomParticipant.condition.condition_name;
        //console.log(conditionForExtension);
        //conditionForExtension = "boost  "; // for testing
        //save condition and participant label on local machine
        //console.log("participantId Extension right after",participantIdForExtension);
        window.browser.storage.local.set(
          {"participant":{"id":randomParticipant.participant_id,
                          "label":participantLabel,
                          "condition": randomParticipant.condition.condition_name }});

        let apiEndPointForCurrentParticipant = baseApiAddress.concat(
          '/participants/',
          String(randomParticipant.participant_id),
          '/');
        // PUT -> pass participant label to db
        fetch(apiEndPointForCurrentParticipant, {
           method: 'PUT',
           headers: {
               'Content-Type': 'application/json'
           },
           body: JSON.stringify(randomParticipant)
         })
         .then((response) => response.json())
         .then((data) => console.log(data))

    })
    .catch(err => {
      console.log('error', err);
    })
  }
}

function getRandomArbitrary(min, max) {
  let randomNumber = Math.random() * (max - min) + min;
  return Math.floor(randomNumber);
}


//messaging
function handleMessaging(message) {
  switch(message.message){
    case "new_page":
      currentDomain = message.domain;
      //getCookieInfo(message);
      break;
    case "boost_closed":
      let boostData = {
        participant: participantIdForExtension,
        modal_type: "boost",
        info: message.boost,
        modal_opened_time: message.start_boost,
        modal_closed_time: message.end_boost
      }
      sendModalTrackingToAPI(boostData);
      break;
    case "nudge_closed":
      let nudgeData = {
        participant: participantIdForExtension,
        modal_type: "nudge",
        info: message.nudge,
        modal_opened_time: message.start_nudge,
        modal_closed_time: message.end_nudge
      }
      sendModalTrackingToAPI(nudgeData);
      break;
    }

  }


function sendModalTrackingToAPI(modalShowData){
  let modalTrackingApiAddress = baseApiAddress.concat("/modal_sessions/")
  fetch(modalTrackingApiAddress, {
     method: 'POST',
     headers: {
         'Content-Type': 'application/json'
     },
     body: JSON.stringify(modalShowData)
   })
   .then((response) => response.json())
   .then((data) => console.log(data));
}


//1 Code between brackets is slightly adapted from https://github.com/princiya/lightbeam-we/blob/master/js/background.js

  // capture third party requests
  async function sendThirdParty(response) {
    if (response.tabId != -1){
      browser.tabs.get(response.tabId, function(tab){

        let tabUrl = new URL(tab.url);
        let targetUrl = new URL(response.url);
        let originUrl = "bla"//getOriginUrl(response); //uncomment aside from screenshots

        if (targetUrl.hostname !== tabUrl.hostname) {
          const thirdPartyData = {
            tabId: response.tabId,
            tabUrl: tabUrl.hostname,
            totalTabUrl: tab.url,
            target: targetUrl.hostname,
            origin: originUrl.hostname,
            requestTime: response.timeStamp
          };
          //console.log('storage.thirdPartyRequest:', tabUrl, thirdPartyData);
          window.browser.storage.local.get(["thirdPartyHistoryNotSaved"], function(result) {
            var newEntry = thirdPartyData;
            if (Object.keys(result).length === 0) {
              var theWholeEntry = new Array()
            } else {
              var theWholeEntry = result["thirdPartyHistoryNotSaved"];
            }
            theWholeEntry.push(newEntry)
            window.browser.storage.local.set({
              "thirdPartyHistoryNotSaved": theWholeEntry
            });
          });

        }

      });
    }

  }

function getOriginUrl(response){
  if(isChrome){
    return(new URL(response.initiator)); // Chrome has a differently named variable
  }else{
    return(originUrl = new URL(response.originUrl));
  }
}

// Get a random boost from the appropriate array of predefined boosts
// @returns the correct sentence to display to enduser directly
function getRandomBoost(){
  let boost = undefined;
  let randomIndex = -1;
  if (samplingPotBoosts.length == 0){
    isFullBoostSampleUsed = true;
  }

  if(isFullBoostSampleUsed){
    samplingPotBoosts = totalBoosts.slice();
    randomIndex = getRandomIndexFromArray(samplingPotBoosts);
    boost = samplingPotBoosts[randomIndex];
    let previousIndex = currentlyUsedBoosts.findIndex(usedBoost => usedBoost == boost)
    currentlyUsedBoosts.splice(previousIndex, 1);

  }else{
    randomIndex = getRandomIndexFromArray(samplingPotBoosts)
    boost = samplingPotBoosts[randomIndex];
  }
  currentlyUsedBoosts.unshift(boost);
  samplingPotBoosts.splice(randomIndex, 1);
  saveBoostRelatedToLocalStorage(currentlyUsedBoosts, samplingPotBoosts, isFullBoostSampleUsed);
  return boost;
}


// Get a random nudge
// @returns the value of the value parameter of the backend response (list of nudge objects) to use
// this then still needs to adjusted (presentation phrases added)
// and there are two nudges per value parameter (one for the whole study, one for a concrete date)
function getRandomNudge(){
  let nudge = undefined;
  let randomIndex = -1;
  if (samplingPotNudges.length == 0){
    isFullNudgeSampleUsed = true;
  }

  if(isFullNudgeSampleUsed){
    samplingPotNudges = totalNudges.slice();
    randomIndex = getRandomIndexFromArray(samplingPotNudges);
    nudge = samplingPotNudges[randomIndex];
    let previousIndex = currentlyUsedNudges.findIndex(usedNudge => usedNudge.value == nudge)
    currentlyUsedNudges.splice(previousIndex, 1);

  }else{
    randomIndex = getRandomIndexFromArray(samplingPotNudges)
    nudge = samplingPotNudges[randomIndex];
  }
  currentlyUsedNudges.unshift(nudge);
  samplingPotNudges.splice(randomIndex, 1);
  return nudge;
}


function getRandomIndexFromArray(myArray){
  let randomIndex = Math.random();
  randomIndex = randomIndex * Object.keys(myArray).length;
  randomIndex = Math.floor(randomIndex);
  return randomIndex;
}

function nudgeFilter(nudgeValue, value, index, array ) {
	return nudgeValue == value.variable ;
}

// preparte the message to send to frontend
function prepareNudgeForPopUp(messageStub, nudgesForParticipant){
  nudges = nudgesForParticipant.filter(nudgeFilter.bind(null, messageStub.value));


  for (let i = 0; i < nudges.length; i++){
    let nudge = nudges[i];
    if (nudge.start_included_date == nudge.end_included_date){
        messageStub['date'] = {
          header: date_header,
          min_total: nudge.min_total,
          max_total: nudge.max_total,
          avg_total: nudge.avg_total,
          own_value: nudge.own_value,
          better_than_percent: nudge.better_than_percent,
          for_date: nudge.start_included_date
        };
    }else{
      messageStub['study'] = {
        header: study_header,
        min_total: nudge.min_total,
        max_total: nudge.max_total,
        avg_total: nudge.avg_total,
        own_value: nudge.own_value,
        better_than_percent: nudge.better_than_percent,
        start_date: nudge.start_included_date,
        end_date: nudge.end_included_date
      };
    }
    messageStub["betterHeader1"] = better_header_1;
    messageStub["betterHeader2"] = better_header_2;
  }
  return messageStub
}


function displayIntervention(timeStamp){
  //console.log("intervention?");
  //if ((timeStamp >= interventionStartDate) && (timeStamp < interventionEndDate) && (previousInterventionDate.getDate() != timeStamp.getDate()) ) {
  if(true){
    //console.log("display intervention!");
    let keepPreviousInterventionDate = previousInterventionDate;
    previousInterventionDate = timeStamp; //comment this for quick testing
    //console.log(conditionForExtension);

    if(conditionForExtension.trim() == "nudge"){
      // handle nudges
      let nudgeApiAddress = baseApiAddress.concat('/study_nudges/?participant_id=', participantIdForExtension)
      fetch(nudgeApiAddress)
      .then(response => {
        return response.json();
      })
      .then(nudgesForParticipant => {
        if (nudgeForModal == undefined){
          let nudgeChoice = getRandomNudge();
          nudgeForModal = prepareNudgeForPopUp(nudgeChoice, nudgesForParticipant.nudges);
        }

        browser.tabs.query({
          currentWindow: true,
          active: true
        }, function(tabs){
          //console.log("send nudge modal", tabs);
                  browser.tabs.sendMessage(tabs[0].id, {
                    message: "nudge_for_modal",
                    nudge: nudgeForModal
                  },
                  function(responseFromMessaging){
                    if(browser.runtime.lastError) {
                      previousInterventionDate = keepPreviousInterventionDate;
                      console.warn("Whoops.. " + chrome.runtime.lastError.message);
                    } else {
                      //console.log("response from modal", responseFromMessaging);
                      if (responseFromMessaging.response == "nudge_modal_displayed"){
                        //console.log("displayed");
                        savePreviousInterventionDateToLocalStorage(previousInterventionDate);
                        let currentlyUsedNudgesReplacement = [];
                        for(let i = 0; i < currentlyUsedNudges.length; i++){
                            let nudgeForList = prepareNudgeForPopUp(currentlyUsedNudges[i], nudgesForParticipant.nudges);
                            currentlyUsedNudgesReplacement.push(nudgeForList)
                        }
                        currentlyUsedNudges = currentlyUsedNudgesReplacement;
                        saveNudgeRelatedToLocalStorage(currentlyUsedNudges, samplingPotNudges, isFullNudgeSampleUsed);
                        isPopupUpToDate = false;
                        saveIsPopupUpToDateToLocalStorage(isPopupUpToDate);
                        nudgeForModal = undefined;
                      } else if (!responseFromMessaging.success || responseFromMessaging == undefined){
                          previousInterventionDate = keepPreviousInterventionDate;
                          //console.log("set prev date back to prev",previousInterventionDate);
                        }
                    }
                  });
        });

      })
      .catch(err => {
        console.log(err);
      });
    }else if(conditionForExtension.trim() == "boost"){

      if (boostForModal == undefined){
        boostForModal = getRandomBoost();
      }
      browser.tabs.query({
          currentWindow: true,
          active: true
        }, function(tabs){
          //console.log("send modal for boost", tabs[0]);
                browser.tabs.sendMessage(tabs[0].id, {
                  message: "boost_for_modal",
                  boost: boostForModal
                }, function(responseFromMessaging){
                  if(browser.runtime.lastError) {
                    previousInterventionDate = keepPreviousInterventionDate;
                    console.warn("Whoops.. " + chrome.runtime.lastError.message);
                  }else{
                    if (responseFromMessaging.response == "boost_modal_displayed"){
                      //console.log("displayed");
                      isPopupUpToDate = false;
                      saveIsPopupUpToDateToLocalStorage(isPopupUpToDate);
                      boostForModal = undefined;
                    } else if(responseFromMessaging == undefined){
                        previousInterventionDate = keepPreviousInterventionDate;
                        //console.log("set prev date back to prev",previousInterventionDate);
                    }
                  }

                });
          });
    }
  }
}

//capture first party requests
function sendFirstParty(tabId, changeInfo, tab) {
    let timeStamp = new Date();
    console.log(displayIntervention);
    displayIntervention(timeStamp);

    const tabUrl = new URL(tab.url);

    // ignore about:* and chrome:* pages and non-visible tabs
    if (tab.status === 'complete'
      && tabUrl.protocol !== 'about:'
      && tabUrl.protocol !== 'chrome:'
      && tabId !== browser.tabs.TAB_ID_NONE) {

      browser.cookies.getAll({}, function(cookies){
        if(browser.privacy.websites.cookieConfig != undefined){
          //We're on Firefox
          isFirefox = true;
          isChrome = false;
          saveBrowserTypeToLocalStorage(isChrome, isFirefox);
          let doNotTrackEnabled = false;
          if(navigator.doNotTrack == 1){
            doNotTrackEnabled = true;
          }
          browser.privacy.websites.cookieConfig.get({}, function(details){
            let cookieConfig = details.value.behavior; //char
            let nonPersistentCookies = details.value.nonPersistentCookies; // true
            browser.privacy.network.webRTCIPHandlingPolicy.get({}, function(details){
              let webRTCIPPolicy = details.value;
              let tabUrlHost = tabUrl.hostname;
              let tabUrlWithoutWww = tabUrlHost.replace(/^(www\.)/,"");
              let timeString = timeStamp.toISOString()
              const firstPartyData = {
                tabId: tabId,
                incognito: tab.incognito,
                totalTabUrl: tab.url,
                tabUrl:tabUrlWithoutWww,
                totalNumCookies: cookies.length,
                timeStamp: timeStamp,
                timeString: timeString,
                is_dnt_enabled: doNotTrackEnabled,
                are_third_party_cookies_allowed: null,
                web_rtcip_policy: webRTCIPPolicy,
                cookie_behavior: cookieConfig,
                nonpersistent_cookies: nonPersistentCookies
              };
              //console.log('storage.firstPartyRequest:', tabUrl.hostname, firstPartyData);
              window.browser.storage.local.get(["firstPartyHistoryNotSaved"], function(result) {
                  var newEntry = firstPartyData;
                  if (Object.keys(result).length === 0) {
                    //console.log("empty array");
                    var theWholeEntry = new Array()
                  } else {
                    var theWholeEntry = result["firstPartyHistoryNotSaved"];
                    var numEntries = theWholeEntry.length
                    var previousEntry = theWholeEntry[numEntries - 1];
                    if(previousEntry.tabId === newEntry.tabId &&
                      previousEntry.tabUrl === newEntry.tabUrl &&
                      previousEntry.totalTabUrl === newEntry.totalTabUrl){
                      if(previousEntry.previousNumCookies != undefined){
                        newEntry.previousNumCookies = previousEntry.previousNumCookies;
                      }
                      theWholeEntry.pop(); // remove the previous entry, since it's the same as the current one in tab and url
                    }
                  }
                  theWholeEntry.push(newEntry);
                  //console.log(theWholeEntry);


                  if (numEntries > 25 || (lastSaveWebsitesDate.getDate() != timeStamp.getDate() && !(lastSaveWebsitesDate == studyStartDate ))){
                     let newPreviousNumCookies = theWholeEntry[theWholeEntry.length-2].totalNumCookies;

                     sendWebsiteVisitDataToDB(theWholeEntry);
                     // save only the most current entry to compare future entries with
                     newEntry.previousNumCookies = newPreviousNumCookies;
                     let entryArray = new Array();
                     entryArray.push(newEntry);
                     //console.log("entryArray",entryArray);
                     window.browser.storage.local.set({
                       "firstPartyHistoryNotSaved": entryArray
                     });
                  }else{
                    window.browser.storage.local.set({
                      "firstPartyHistoryNotSaved": theWholeEntry
                    });
                  }
              });



            });
          });
        }

        if(browser.privacy.websites.thirdPartyCookiesAllowed != undefined){
          //We're on chrome
          isChrome = true;
          isFirefox = false;
          saveBrowserTypeToLocalStorage(isChrome, isFirefox);
          browser.privacy.websites.thirdPartyCookiesAllowed.get({}, function(details){
             //bool
            let thirdPartyCookiesAllowed = details.value;
            browser.privacy.network.webRTCIPHandlingPolicy.get({}, function(details){
               //char
              let webRTCIPPolicy = details.value;
              browser.privacy.websites.doNotTrackEnabled.get({}, function(details){
                let doNotTrackEnabled = details.value;
                let tabUrlWithoutWww = tabUrl.hostname.replace(/^(www\.)/,"");
                let timeString = timeStamp.toISOString();
                const firstPartyData = {
                  tabId: tabId,
                  incognito: tab.incognito,
                  totalTabUrl: tab.url,
                  tabUrl:tabUrlWithoutWww,
                  totalNumCookies: cookies.length,
                  timeStamp: timeStamp,
                  timeString: timeString,
                  is_dnt_enabled: doNotTrackEnabled,
                  are_third_party_cookies_allowed: thirdPartyCookiesAllowed,
                  web_rtcip_policy: webRTCIPPolicy,
                  cookie_behavior: null,
                  nonpersistent_cookies: null
                };
                //console.log('storage.firstPartyRequest:', tabUrl.hostname, firstPartyData);
                window.browser.storage.local.get(["firstPartyHistoryNotSaved"], function(result) {
                    var newEntry = firstPartyData;
                    if (Object.keys(result).length === 0) {
                      //console.log("empty array");
                      var theWholeEntry = new Array()
                    } else {
                      var theWholeEntry = result["firstPartyHistoryNotSaved"];
                      var numEntries = theWholeEntry.length
                      var previousEntry = theWholeEntry[numEntries - 1];
                      if(previousEntry.tabId === newEntry.tabId &&
                        previousEntry.tabUrl === newEntry.tabUrl &&
                        previousEntry.totalTabUrl === newEntry.totalTabUrl){
                        if(previousEntry.previousNumCookies != undefined){
                          newEntry.previousNumCookies = previousEntry.previousNumCookies;
                        }
                        theWholeEntry.pop(); // remove the previous entry, since it's the same as the current one in tab and url
                      }
                    }
                    theWholeEntry.push(newEntry);


                    if (numEntries > 25 || (lastSaveWebsitesDate.getDate() != timeStamp.getDate() && !(lastSaveWebsitesDate == studyStartDate ))){
                       let newPreviousNumCookies = theWholeEntry[theWholeEntry.length-2].totalNumCookies;

                       sendWebsiteVisitDataToDB(theWholeEntry);
                       // save only the most current entry to compare future entries with
                       newEntry.previousNumCookies = newPreviousNumCookies;
                       let entryArray = new Array();
                       entryArray.push(newEntry);
                       //console.log("entryArray",entryArray);
                       window.browser.storage.local.set({
                         "firstPartyHistoryNotSaved": entryArray
                       });
                    }else{
                      window.browser.storage.local.set({
                        "firstPartyHistoryNotSaved": theWholeEntry
                      });
                    }
                });
              });
            });
          });
        }

      });
    }
  }

//1 Code got from https://github.com/princiya/lightbeam-we/blob/master/js/background.js ends here

// @param: firstParties: entries about first party data from the local storage, which have not yet been saved to DB
// @returns: the number of cookies before the last entry.
function sendWebsiteVisitDataToDB(firstParties){
  //console.log("inside function first parties", firstParties);
  let numEntries = firstParties.length;
  let numCookiesToReturn = 0;

  window.browser.storage.local.get(["thirdPartyHistoryNotSaved"], function(thirdPartyHistoryNotSaved) {
    let thirdPartyHistory = thirdPartyHistoryNotSaved.thirdPartyHistoryNotSaved;
    //console.log("third party hisory", thirdPartyHistory);

    //start with the latest first party
    let firstPartyListWithAdditionalInfo = new Array();
    let finalTimeStamp = firstParties[numEntries-1].timeStamp;
    for(let i = firstParties.length-1; i >=0; i--){

      let currentFirstParty = firstParties[i];
      let previousFirstParty = firstParties[i-1];
      let accumulatedCookies = accumulateCookiesForFirstPartyWebsite(currentFirstParty, previousFirstParty, i, firstParties.length)

      // accumulate Third Party requests per first party
      if(i >= numEntries-1){

        //don't accumulate thirdpartyrequests for this, will be done in the next run through
      }else{
        let nextTimeStamp = firstParties[i+1].timeStamp;
        let numberOfThirdPartyRequestsForCurrentFirstParty = 0;
        for(let j = thirdPartyHistory.length-1; j >=0; j--){
          let currentThirdParty = thirdPartyHistory[j];
          if(currentThirdParty.tabId == currentFirstParty.tabId && //tab has to be the same
            currentThirdParty.totalTabUrl == currentFirstParty.totalTabUrl /*website has to be the same*/){
            thirdPartyHistory.splice(j, 1)
            numberOfThirdPartyRequestsForCurrentFirstParty += 1;
          }else if(currentThirdParty.requestTime < currentFirstParty.timeStamp){
            /* if the request occurs before the current first party timestamp,
            it belongs to the previous first party,
            all further entries are skipped */
            break;
          }

        }
        window.browser.storage.local.set(
          {"thirdPartyHistoryNotSaved":thirdPartyHistory});

        //console.log("current first party:", currentFirstParty);
        //console.log("num 3rd Party requests", numberOfThirdPartyRequestsForCurrentFirstParty);
        //console.log("num cookies", accumulatedCookies);
        if (numberOfThirdPartyRequestsForCurrentFirstParty ==  null){
          currentFirstParty.num3rdPartyRequests = 0;
        }else{
          currentFirstParty.num3rdPartyRequests = numberOfThirdPartyRequestsForCurrentFirstParty;
        }

        currentFirstParty.numNewCookies = accumulatedCookies;
        firstPartyListWithAdditionalInfo.push(currentFirstParty);
      }

    }
    //console.log("cookies to return ", numCookiesToReturn);
    window.browser.storage.local.get(["localWebsiteCategorization"],
      getCategoriesAndSendToDB.bind(this, firstPartyListWithAdditionalInfo)
    );


    //console.log(thirdPartyHistory);

  });

}

/*
* Check the local storage to see if the current websites have already been categorized locally
* if yes: post new website visits
* if no: get website categorization for those domains
*/
function getCategoriesAndSendToDB(firstPartyList, result){
  //console.log("participantid", participantIdForExtension);
  //console.log("getCategories and Send to DB", result);
  //console.log("first Party list", firstPartyList);
    let categorizationGetRequestPreparation = new Array();
    let websiteVisitPostRequestPreparation = new Array();
    let localWebsitesCategorization = "";
    if (Object.keys(result).length === 0) {
      localWebsitesCategorization = new Array();
      //console.log("not yet assigned", localWebsitesCategorization);
    } else {
      localWebsitesCategorization = result.localWebsiteCategorization;
      //console.log(localWebsitesCategorization)
    }

    //console.log("localWebsitesResult this inside callback", result);
    //console.log("first Party inside callback", firstPartyList);
    //console.log("categorization_array", localWebsitesCategorization);
    let firstPartiesNotYetCategorized = [];
    let domainsNotYetCategorized = [];

    for(let a = 0; a < firstPartyList.length; a++){

      let currentFirstParty = firstPartyList[a];

      let currentFirstPartyCategorization = [];
      if(localWebsitesCategorization.length > 0){
        currentFirstPartyCategorization = localWebsitesCategorization.filter(
            filterForDomainName.bind(this, currentFirstParty.tabUrl)
        );
      }

      if(currentFirstPartyCategorization.length == 0){
        // not yet categorized
        //console.log("localWebsitesCategorization", localWebsitesCategorization)
        localWebsitesCategorization.push({domain: currentFirstParty.tabUrl,
            id:localWebsitesCategorization.length,
            categories:[]}
          );
          currentFirstParty.local_id = localWebsitesCategorization.length;
        firstPartiesNotYetCategorized.push(currentFirstParty);
        domainsNotYetCategorized.push(currentFirstParty.tabUrl);
        categorizationGetRequestPreparation.push(currentFirstParty.tabUrl);
      }else if(currentFirstPartyCategorization[0].categories.length ==0){
        //"not yet categorized, but id assigned"
        currentFirstParty.local_id = currentFirstPartyCategorization[0].id;
        firstPartiesNotYetCategorized.push(currentFirstParty);
      }else if(currentFirstPartyCategorization[0].categories.length != 0){
        //already categorized
        let currentTimeStamp = currentFirstParty.timeString;

        let postRequestWebsiteVisit = {
          website_id_per_participant:currentFirstPartyCategorization[0].id,
          participant: participantIdForExtension,
          categories: currentFirstPartyCategorization[0].categories,
          num_cookies: currentFirstParty.numNewCookies,
          num_third_requests: currentFirstParty.num3rdPartyRequests,
          is_incognito: currentFirstParty.incognito,
          timestamp_start: currentTimeStamp,
          is_dnt_enabled: currentFirstParty.is_dnt_enabled,
          are_third_party_cookies_allowed: currentFirstParty.are_third_party_cookies_allowed,
          web_rtcip_policy: currentFirstParty.web_rtcip_policy,
          cookie_behavior: currentFirstParty.cookie_behavior,
          nonpersistent_cookies: currentFirstParty.nonpersistent_cookies
        };
        websiteVisitPostRequestPreparation.push(postRequestWebsiteVisit);
      }
    }
    //console.log(localWebsitesCategorization);
    //console.log("domains not yet",domainsNotYetCategorized);
    //console.log("firstPartysNot yet", firstPartiesNotYetCategorized);
/*    window.browser.storage.local.set({
      "localWebsiteCategorization": localWebsitesCategorization
    });
    */
    // post all the data in websiteVisitPostRequestPreparation

    websiteVisitPostRequestPreparation = postWebsiteVisits(websiteVisitPostRequestPreparation);

    // get the categorization data for the domains in categorizationGetRequestPreparation
    // api call looks like: protocol://host/api/website_categorizations/?domains=p,a,jjj
    if(domainsNotYetCategorized.length > 0){
      let apiAddressDomainCategorizations = baseApiAddress.concat('/website_categorizations/?domains=');
      //console.log(apiAddressDomainCategorizations);
      for(let p = 0; p < domainsNotYetCategorized.length; p++){
        let toAppend = domainsNotYetCategorized[p];
        //console.log(toAppend);
        apiAddressDomainCategorizations = apiAddressDomainCategorizations.concat(toAppend);
        if(!(p == (domainsNotYetCategorized.length -1))){
          apiAddressDomainCategorizations = apiAddressDomainCategorizations.concat(",");
        }
      }
      fetch(apiAddressDomainCategorizations)
      .then(response => {
        return response.json();
      })
      .then(websiteCategorizations => {
        // add the categorizations to the localWebsitesCategorization and save that back to local storage
        //console.log("returned request:",websiteCategorizations);
        //console.log("local websites categorizations", localWebsitesCategorization);
        let prepareNewPostRequest = new Array();
        for(let m = 0; m < websiteCategorizations.length; m++){
            // prepare adding to local storage
          let currentWebsiteCategorization = websiteCategorizations[m];
          let categories = currentWebsiteCategorization.categories
          let domain = currentWebsiteCategorization.domain;
          let index = localWebsitesCategorization.findIndex(website => website.domain == domain);
        
          if(index != -1){
            let correspondingLocalWebsiteCategorization = localWebsitesCategorization[index];
            if(correspondingLocalWebsiteCategorization.categories.length == 0){
              for(let n = 0; n < categories.length; n++){
                correspondingLocalWebsiteCategorization.categories.push(categories[n]);
              }
            }
            localWebsitesCategorization.fill(correspondingLocalWebsiteCategorization, index, index++);
          }else{
            console.log("ATTENTION, current website not in localWebsitesCategorization: ", domain)
          }
            // add the categorizations to the websites in firstPartiesNotYetCategorized
          let nonCategorizedIndex = firstPartiesNotYetCategorized.findIndex(
            website => website.tabUrl == domain);
          if(nonCategorizedIndex != -1){
            let currentFirstParty = firstPartiesNotYetCategorized[nonCategorizedIndex];
            let currentTimeStamp = currentFirstParty.timeStamp;

            prepareNewPostRequest.push({
              website_id_per_participant:currentFirstParty.local_id,
              participant: participantIdForExtension,
              categories: categories,
              num_cookies: currentFirstParty.numNewCookies,
              num_third_requests: currentFirstParty.num3rdPartyRequests,
              timestamp_start: currentFirstParty.timeString,
              is_incognito: currentFirstParty.incognito,
              is_dnt_enabled: currentFirstParty.is_dnt_enabled,
              are_third_party_cookies_allowed: currentFirstParty.are_third_party_cookies_allowed,
              web_rtcip_policy: currentFirstParty.web_rtcip_policy,
              cookie_behavior: currentFirstParty.cookie_behavior,
              nonpersistent_cookies: currentFirstParty.nonpersistent_cookies
            });
          }else{
            console.log("ATTENTION, current website not in list of non categorized first parties: ", domain)
          }
        }

          window.browser.storage.local.set({
            "localWebsiteCategorization": localWebsitesCategorization
          });


          // post all the data from the altered firstPartiesNotYetCategorized
        prepareNewPostRequest = postWebsiteVisits(prepareNewPostRequest);


      })
      .catch(err => {
        console.log('error', err);
      })
    }
}

function postWebsiteVisits(websiteVisitPostRequestPreparation){
  let apiEndPointForWebsiteVisits = baseApiAddress.concat('/website_visits/')
  for (let k = 0; k < websiteVisitPostRequestPreparation.length; k++){
    let websiteVisit = websiteVisitPostRequestPreparation.pop();

    fetch(apiEndPointForWebsiteVisits, {
       method: 'POST',
       headers: {
           'Content-Type': 'application/json'
       },
       body: JSON.stringify(websiteVisit)
     })
     .then((response) => response.json())
     //.then((data) => //console.log("websitepost",data));
   }
   return websiteVisitPostRequestPreparation;
}


function accumulateCookiesForFirstPartyWebsite(currentFirstParty, previousFirstParty, i, firstPartiesLength){
  let accumulatedCookies = 0
  // calculate difference in cookies from previous first party to current first party = number of cookies set by current first party
  if (i == 0){// oldest firstParty in list
    if(currentFirstParty.previousNumCookies == undefined){//the very first entry of the browser extension
        accumulatedCookies = currentFirstParty.totalNumCookies;
    }else{
        accumulatedCookies = currentFirstParty.totalNumCookies - currentFirstParty.previousNumCookies;
    }
  }else{
    accumulatedCookies = currentFirstParty.totalNumCookies - previousFirstParty.totalNumCookies;
  }
  return accumulatedCookies;
}



// Use this function to filter a list of firstParty-Objects with additional info
function filterForDomainName(domainName, value, index, array) {
  return value.domain == domainName;
}

function getCookieInfo(message){
  //console.log(message.url);
  //console.log(message.domain);
  window.browser.cookies.getAll({"url":message.url}, function(cookies){
    //console.log(cookies);
      if (cookies.length > 0) {
        //console.log("num total cookies: ", cookies.length);
        for (let cookie of cookies) {
          // check for each cookie whether it's a first or third party cookie (sadly, this is not easy, did not find a way)
          // console.log(cookie);
        }
      } else {
        console.log("No cookies in this tab.");
      }
  });
}

// functions to persist variables in local storage so they still have the same value after closing and reopening the browser
function saveUserParticipationCodeToLocalStorage(userParticipationCode){
  window.browser.storage.local.set(
    {"userParticipationCode": userParticipationCode}
  )
}

function savePreviousInterventionDateToLocalStorage(previousInterventionDate){
  window.browser.storage.local.set(
    {"previousInterventionDate": previousInterventionDate}
  );
}

function saveNudgeRelatedToLocalStorage(currentlyUsedNudges, samplingPotNudges, isFullNudgeSampleUsed){
  window.browser.storage.local.set(
    {"nudges":{"currentlyUsedNudges":currentlyUsedNudges,
                    "samplingPotNudges":samplingPotNudges,
                    "isFullNudgeSampleUsed": isFullNudgeSampleUsed}});
}

function saveBoostRelatedToLocalStorage(currentlyUsedBoosts, samplingPotBoosts, isFullBoostSampleUsed){
  window.browser.storage.local.set(
    {"boosts":{"currentlyUsedBoosts":currentlyUsedBoosts,
                    "samplingPotBoosts":samplingPotBoosts,
                    "isFullBoostSampleUsed": isFullBoostSampleUsed}});
}

function saveEndOfStudyNudgesToLocalStorage(endOfStudyNudges){
  if (endOfStudyNudges != undefined){
    window.browser.storage.local.set({"endOfStudyNudges": endOfStudyNudges});
  }
}

function saveIsPopupUpToDateToLocalStorage(isPopupUpToDate){
  window.browser.storage.local.set({
    "isPopupUpToDate":isPopupUpToDate
  });
}

function saveIsAllQuestionnairesFilledOutToLocalStorage(isAllQuestionnairesFilledOut){
  window.browser.storage.local.set({
    "isAllQuestionnairesFilledOut":isAllQuestionnairesFilledOut
  });
}

function saveIsAllInfoShownToLocalStorage(isAllInfoShown){
  window.browser.storage.local.set({
    "isAllInfoShown":isAllInfoShown
  });
}

function saveLastSaveWebsitesDateToLocalStorage(lastSaveWebsitesDate){
  window.browser.storage.local.set({
    "lastSaveWebsitesDate":lastSaveWebsitesDate
  });
}

function saveBrowserTypeToLocalStorage(isChrome, isFirefox){
  window.browser.storage.local.set({"browserType":{
    "isChrome":isChrome,
    "isFirefox": isFirefox
  }});
}

//check whether an object has any properties
function isEmptyObject(map) {
   for(var key in map) {
     if (map.hasOwnProperty(key)) {
        return false;
     }
   }
   return true;
}
