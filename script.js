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

// Google map object (we fill it in inside initMap)
var map;

// Array that will hold our 5 quiz locations.
// Each item is a simple object with a name and LatLngBounds.
var quizLocations = [];

// Index of the current location we are asking about (0 to 4)
var currentIndex = 0;

// How many answers were correct so far
var correctCount = 0;

// Keep all rectangle objects here so they stay on the map
var allRectangles = [];

// Simple timer values (extra feature)
var timerInterval = null;
var elapsedSeconds = 0;
var gameStarted = false;

// Quick references to DOM elements (so we do not search every time)
var questionNumberSpan;
var questionTotalSpan;
var correctCountSpan;
var timerSpan;
var statusBarDiv;
var questionListItems;
var mapDiv;
var resetButton;

/* =========================================================
   REQUIREMENT 1.1, 1.2, 1.6:
   - Show CSUN map.
   - User double clicks the map to guess a location.
   - Panning and zooming are turned off.
   - We also use two UNIQUE Google Maps features for the
     presentation:
       (A) Map 'dblclick' event.
       (B) LatLngBounds class for hit‑testing the rectangles.
   ========================================================= */

// This function will be called by Google Maps when the script file loads
function initMap() {
  // Grab HTML elements now that the page has loaded
  questionNumberSpan = document.getElementById("question-number");
  questionTotalSpan  = document.getElementById("question-total");
  correctCountSpan   = document.getElementById("correct-count");
  timerSpan          = document.getElementById("timer");
  statusBarDiv       = document.getElementById("status-bar");
  mapDiv             = document.getElementById("map");
  resetButton        = document.getElementById("reset-button");
  questionListItems  = document.querySelectorAll("#question-list li");

  // We have 5 questions total (4 of ours + 1 instructor location)
  questionTotalSpan.innerHTML = "5";

  // ---- Set up Google map itself ----
  // Center is set near the middle of CSUN campus.
  // NOTE: These coordinates are general campus center.
  var campusCenter = { lat: 34.2385, lng: -118.5283 };

  map = new google.maps.Map(mapDiv, {
    center: campusCenter,
    zoom: 16,

    // REQUIREMENT 1.6:
    // Turn off panning and zooming.
    draggable: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    keyboardShortcuts: false,
    zoomControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false
  });

  // REQUIREMENT 1.2 and EXTRA FEATURE A:
  // Use the Google Maps 'dblclick' event on the Map object.
  // User will double click where they think the building is.
  map.addListener("dblclick", handleMapDoubleClick);

  // Build the location data and LatLngBounds objects.
  buildQuizLocations();

  // Highlight first question in the list.
  updateQuestionListHighlight();

  // Wire the reset button
  resetButton.addEventListener("click", resetGame);
}

/* =========================================================
   BUILD QUIZ LOCATION DATA
   ---------------------------------------------------------
   REQUIREMENT 1.3, 1.4, 1.5:
   We keep the data for each building in an array of objects.
   Each object has:
     - name        : building name
     - question    : question text
     - bounds      : google.maps.LatLngBounds rectangle
   The bounds are used both for green/red rectangles and for
   checking if the double click was inside or outside.
   This is where we use UNIQUE FEATURE (B) LatLngBounds.
   ========================================================= */

function buildQuizLocations() {
  // NOTE:
  // The latitude / longitude numbers below are ESTIMATES.
  // They may not line up perfectly with each building.
  // Use the step‑by‑step guide at the end of this file’s comments
  // to fine‑tune them in your own project.

  // Helper function to create LatLngBounds in a simple way
  function makeBounds(swLat, swLng, neLat, neLng) {
    // LatLngBounds takes a south‑west corner and a north‑east corner.
    return new google.maps.LatLngBounds(
      { lat: swLat, lng: swLng },
      { lat: neLat, lng: neLng }
    );
  }

  // 0. Instructor location for Sergio:
  //    Sequoia Hall — grid E4 on the campus map.
  quizLocations.push({
    name: "Sequoia Hall",
    question: "Where is Sequoia Hall?",
    bounds: makeBounds(34.2379, -118.5265, 34.2393, -118.5247)
  });

  // 1. Our own choice: University Library
  quizLocations.push({
    name: "University Library",
    question: "Where is the University Library?",
    bounds: makeBounds(34.2382, -118.5300, 34.2393, -118.5288)
  });

  // 2. Our own choice: Sierra Tower
  quizLocations.push({
    name: "Sierra Tower",
    question: "Where is Sierra Tower?",
    bounds: makeBounds(34.2402, -118.5310, 34.2410, -118.5299)
  });

  // 3. Our own choice: Student Recreation Center
  quizLocations.push({
    name: "Student Recreation Center",
    question: "Where is the Student Recreation Center?",
    bounds: makeBounds(34.2378, -118.5226, 34.2390, -118.5214)
  });

  // 4. Our own choice: The Soraya (Performing Arts Center)
  quizLocations.push({
    name: "The Soraya",
    question: "Where is The Soraya?",
    // This one is close to published coordinate 34.235690, -118.529141 [cite:285]
    bounds: makeBounds(34.2350, -118.5300, 34.2362, -118.5285)
  });
}

/* =========================================================
   HANDLE USER DOUBLE CLICK
   ---------------------------------------------------------
   This runs every time user double clicks on the Google map.
   - REQUIREMENT 1.1: user is prompted to double click.
   - REQUIREMENT 1.2: we read where they clicked.
   - REQUIREMENT 1.3, 1.4: show green/red rectangle and message.
   - REQUIREMENT 1.5: after 5 questions, show total results.
   ========================================================= */

function handleMapDoubleClick(event) {
  // Start timer on very first map double click (extra feature).
  if (!gameStarted) {
    startTimer();
    gameStarted = true;
  }

  // If game is already finished, ignore extra clicks.
  if (currentIndex >= quizLocations.length) {
    return;
  }

  var clickLatLng = event.latLng; // LatLng object of where user double clicked
  var currentLocation = quizLocations[currentIndex];

  // UNIQUE FEATURE (B) LatLngBounds:
  // Check if the clicked point is inside the rectangle
  var isInside = currentLocation.bounds.contains(clickLatLng);

  // Draw the rectangle in green or red
  drawResultRectangle(currentLocation.bounds, isInside);

  // Update text feedback and score.
  if (isInside) {
    correctCount++;
    correctCountSpan.innerHTML = correctCount;
    setStatusCorrect("Nice job! You found " + currentLocation.name + ".");
    markQuestionListItem("answered-correct");

    // Extra simple animation on map when correct
    flashMap("map-flash-correct");
  } else {
    setStatusWrong("Sorry, that was not " + currentLocation.name + ". The red box shows the correct area.");
    markQuestionListItem("answered-wrong");
    flashMap("map-flash-wrong");
  }

  // Move to next question
  currentIndex++;

  if (currentIndex < quizLocations.length) {
    questionNumberSpan.innerHTML = (currentIndex + 1);
    updateQuestionListHighlight();
  } else {
    // REQUIREMENT 1.5: after five locations, show total correct.
    endGame();
  }
}

/* =========================================================
   DRAW RECTANGLE ON MAP
   ---------------------------------------------------------
   We reuse this for both green and red rectangles.
   ========================================================= */

function drawResultRectangle(bounds, isCorrect) {
  var strokeColor;
  var fillColor;

  if (isCorrect) {
    strokeColor = "#008000"; // green
    fillColor = "rgba(0, 255, 0, 0.5)";
  } else {
    strokeColor = "#cc0000"; // red
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
   TIMER (EXTRA FEATURE 2.2 FROM HANDOUT)
   ---------------------------------------------------------
   Simple seconds timer that starts with the first guess
   and stops when the game ends.
   ========================================================= */

function startTimer() {
  // Do not start if already running
  if (timerInterval !== null) {
    return;
  }

  elapsedSeconds = 0;
  updateTimerDisplay();

  timerInterval = setInterval(function() {
    elapsedSeconds++;
    updateTimerDisplay();
  }, 1000); // run every 1 second
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

  // Simple leading zero formatter like in your typing test
  var mm = minutes < 10 ? "0" + minutes : "" + minutes;
  var ss = seconds < 10 ? "0" + seconds : "" + seconds;

  timerSpan.innerHTML = mm + ":" + ss;
}

/* =========================================================
   SIMPLE MAP FLASH ANIMATION
   ---------------------------------------------------------
   Adds a CSS class for half a second to show a soft pulse.
   ========================================================= */

function flashMap(className) {
  // Remove old classes first
  mapDiv.classList.remove("map-flash-correct");
  mapDiv.classList.remove("map-flash-wrong");

  // Force browser to reflow so animation can restart
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

  setStatusNeutral(message + " Double click Start Over to play again.");
}

/* =========================================================
   RESET GAME STATE
   ---------------------------------------------------------
   Clears rectangles, scores, timer, and question list.
   ========================================================= */

function resetGame() {
  // Remove rectangles from the map
  var i;
  for (i = 0; i < allRectangles.length; i++) {
    allRectangles[i].setMap(null);
  }
  allRectangles = [];

  currentIndex = 0;
  correctCount = 0;
  correctCountSpan.innerHTML = "0";
  questionNumberSpan.innerHTML = "1";

  // Reset question list colors
  for (i = 0; i < questionListItems.length; i++) {
    questionListItems[i].className = "";
  }
  updateQuestionListHighlight();

  // Reset status bar and timer
  setStatusNeutral("Game reset. Double click on the map to guess the first location.");
  stopTimer();
  elapsedSeconds = 0;
  updateTimerDisplay();
  gameStarted = false;
}