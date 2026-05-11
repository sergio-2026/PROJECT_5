/* ---------------------------------------------------------
   CSUN Map Quiz
   Author: Sergio Ruelas
   File: script.js

   This file uses plain JavaScript and the Google Maps API.
   It follows the COMP 484 style from lecture slides.
--------------------------------------------------------- */


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

var map;
var quizLocations = [];
var currentIndex = 0;
var correctCount = 0;
var allRectangles = [];
var timerInterval = null;
var elapsedSeconds = 0;
var gameStarted = false;

var questionNumberSpan;
var questionTotalSpan;
var correctCountSpan;
var timerSpan;
var statusBarDiv;
var questionListItems;
var mapDiv;
var resetButton;


/* =========================================================
   REQUIREMENT 1.1, 1.2, 1.6
   ========================================================= */

function initMap() {
  questionNumberSpan = document.getElementById("question-number");
  questionTotalSpan  = document.getElementById("question-total");
  correctCountSpan   = document.getElementById("correct-count");
  timerSpan          = document.getElementById("timer");
  statusBarDiv       = document.getElementById("status-bar");
  mapDiv             = document.getElementById("map");
  resetButton        = document.getElementById("reset-button");
  questionListItems  = document.querySelectorAll("#question-list li");

  questionTotalSpan.innerHTML = "5";

  // Center is the midpoint of the locked bounds
  var campusCenter = { lat: 34.23828, lng: -118.52954 };

  // The locked boundary the map cannot leave
  var campusBounds = {
    north: 34.240971249792935,
    south: 34.23559711347527,
    east:  -118.52734390838299,
    west:  -118.53174335248659
  };

  // Map style: removes all road names, POI labels, business names,
  // transit icons so only the clean satellite/roadmap geometry shows.
  var cleanStyle = [
    { featureType: "all",     elementType: "labels",            stylers: [{ visibility: "off" }] },
    { featureType: "road",    elementType: "labels",            stylers: [{ visibility: "off" }] },
    { featureType: "poi",     elementType: "labels",            stylers: [{ visibility: "off" }] },
    { featureType: "transit", elementType: "labels",            stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "labels",     stylers: [{ visibility: "off" }] },
    { featureType: "landscape",      elementType: "labels",     stylers: [{ visibility: "off" }] },
    { featureType: "water",          elementType: "labels",     stylers: [{ visibility: "off" }] }
  ];

  map = new google.maps.Map(mapDiv, {
    center: campusCenter,
    zoom: 17,

    // Lock map inside the campus bounds — user cannot pan outside
    restriction: {
      latLngBounds: campusBounds,
      strictBounds: true
    },

    // REQUIREMENT 1.6: Turn off panning and zooming
    draggable: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    keyboardShortcuts: false,
    zoomControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,

    // Apply the clean no-label style
    styles: cleanStyle
  });

  map.addListener("dblclick", handleMapDoubleClick);

  buildQuizLocations();
  updateQuestionListHighlight();
  resetButton.addEventListener("click", resetGame);
}


/* =========================================================
   BUILD QUIZ LOCATION DATA
   ========================================================= */

function buildQuizLocations() {

  function makeBounds(swLat, swLng, neLat, neLng) {
    return new google.maps.LatLngBounds(
      { lat: swLat, lng: swLng },
      { lat: neLat, lng: neLng }
    );
  }

  // 0. Instructor location: Sequoia Hall
  quizLocations.push({
    name: "Sequoia Hall",
    question: "Where is Sequoia Hall?",
    bounds: makeBounds(
      34.2401272880422,  -118.52844705192415,
      34.24079600506163, -118.52762709326564
    )
  });

  // 1. University Library
  quizLocations.push({
    name: "University Library",
    question: "Where is the University Library?",
    bounds: makeBounds(
      34.239509413156675, -118.53003414074551,
      34.2403937110296,   -118.5285623728782
    )
  });

  // 2. Sierra Tower
  quizLocations.push({
    name: "Sierra Tower",
    question: "Where is Sierra Tower?",
    bounds: makeBounds(
      34.23845145562707,  -118.53034703930294,
      34.23910406164635,  -118.53009668326304
    )
  });

  // 3. Student Recreation Center
  quizLocations.push({
    name: "Student Recreation Center",
    question: "Where is the Student Recreation Center?",
    bounds: makeBounds(
      34.239319395387106, -118.52518628700064,
      34.24061112895547,  -118.52469615064189
    )
  });

  // 4. The Soraya (Performing Arts Center)
  quizLocations.push({
    name: "The Soraya",
    question: "Where is The Soraya?",
    bounds: makeBounds(
      34.23577653148262, -118.52877358762456,
      34.23667349045248, -118.52747304895206
    )
  });
}


/* =========================================================
   HANDLE USER DOUBLE CLICK
   ========================================================= */

function handleMapDoubleClick(event) {
  if (!gameStarted) {
    startTimer();
    gameStarted = true;
  }

  if (currentIndex >= quizLocations.length) {
    return;
  }

  var clickLatLng = event.latLng;
  var currentLocation = quizLocations[currentIndex];
  var isInside = currentLocation.bounds.contains(clickLatLng);

  drawResultRectangle(currentLocation.bounds, isInside);

  if (isInside) {
    correctCount++;
    correctCountSpan.innerHTML = correctCount;
    setStatusCorrect("Nice job! You found " + currentLocation.name + ".");
    markQuestionListItem("answered-correct");
    flashMap("map-flash-correct");
  } else {
    setStatusWrong("Sorry, that was not " + currentLocation.name + ". The red box shows the correct area.");
    markQuestionListItem("answered-wrong");
    flashMap("map-flash-wrong");
  }

  currentIndex++;

  if (currentIndex < quizLocations.length) {
    questionNumberSpan.innerHTML = (currentIndex + 1);
    updateQuestionListHighlight();
  } else {
    endGame();
  }
}


/* =========================================================
   DRAW RECTANGLE ON MAP
   ========================================================= */

function drawResultRectangle(bounds, isCorrect) {
  var strokeColor;
  var fillColor;

  if (isCorrect) {
    strokeColor = "#008000";
    fillColor = "rgba(0, 255, 0, 0.5)";
  } else {
    strokeColor = "#cc0000";
    fillColor = "rgba(255, 0, 0, 0.5)";
  }

  var rect = new google.maps.Rectangle({
    map: map,
    bounds: bounds,
    strokeColor: strokeColor,
    strokeWeight: 2,
    fillColor: fillColor,
    fillOpacity: 0.25
  });

  allRectangles.push(rect);
}


/* =========================================================
   STATUS BAR HELPERS
   ========================================================= */

function setStatusNeutral(message) {
  statusBarDiv.className = "status-neutral";
  statusBarDiv.innerHTML = message;
}

function setStatusCorrect(message) {
  statusBarDiv.className = "status-correct";
  statusBarDiv.innerHTML = message;
}

function setStatusWrong(message) {
  statusBarDiv.className = "status-wrong";
  statusBarDiv.innerHTML = message;
}


/* =========================================================
   QUESTION LIST HIGHLIGHTING
   ========================================================= */

function updateQuestionListHighlight() {
  var i;
  for (i = 0; i < questionListItems.length; i++) {
    questionListItems[i].classList.remove("current-question");
  }
  if (currentIndex < questionListItems.length) {
    questionListItems[currentIndex].classList.add("current-question");
  }
}

function markQuestionListItem(className) {
  if (currentIndex < questionListItems.length) {
    questionListItems[currentIndex].classList.remove("current-question");
    questionListItems[currentIndex].classList.add(className);
  }
}


/* =========================================================
   TIMER (EXTRA FEATURE)
   ========================================================= */

function startTimer() {
  if (timerInterval !== null) {
    return;
  }
  elapsedSeconds = 0;
  updateTimerDisplay();
  timerInterval = setInterval(function() {
    elapsedSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  var minutes = Math.floor(elapsedSeconds / 60);
  var seconds = elapsedSeconds % 60;
  var mm = minutes < 10 ? "0" + minutes : "" + minutes;
  var ss = seconds < 10 ? "0" + seconds : "" + seconds;
  timerSpan.innerHTML = mm + ":" + ss;
}


/* =========================================================
   MAP FLASH ANIMATION
   ========================================================= */

function flashMap(className) {
  mapDiv.classList.remove("map-flash-correct");
  mapDiv.classList.remove("map-flash-wrong");
  void mapDiv.offsetWidth;
  mapDiv.classList.add(className);
}


/* =========================================================
   END GAME SUMMARY (REQUIREMENT 1.5)
   ========================================================= */

function endGame() {
  stopTimer();
  var wrong = quizLocations.length - correctCount;
  var message = correctCount + " correct, " + wrong + " incorrect in " + timerSpan.innerHTML + ".";
  setStatusNeutral(message + " Click Start Over to play again.");
}


/* =========================================================
   RESET GAME STATE
   ========================================================= */

function resetGame() {
  var i;

  for (i = 0; i < allRectangles.length; i++) {
    allRectangles[i].setMap(null);
  }
  allRectangles = [];

  currentIndex = 0;
  correctCount = 0;
  correctCountSpan.innerHTML = "0";
  questionNumberSpan.innerHTML = "1";

  for (i = 0; i < questionListItems.length; i++) {
    questionListItems[i].className = "";
  }
  updateQuestionListHighlight();

  setStatusNeutral("Game reset. Double click on the map to guess the first location.");
  stopTimer();
  elapsedSeconds = 0;
  updateTimerDisplay();
  gameStarted = false;
}