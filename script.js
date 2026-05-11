// CSUN Map Quiz
// script.js
// Author: Sergio Ruelas


// ---- GLOBAL VARIABLES ----

// Holds the Google Map object after initMap creates it
var map;

// Each item in this array is one quiz question.
// It stores the building name, the question text, and the rectangle bounds.
var quizLocations = [];

// Tracks which question we are on (0 = first, 4 = last)
var currentIndex = 0;

// Counts how many questions the user got right
var correctCount = 0;

// Keeps every rectangle we draw so we can remove them on reset
var allRectangles = [];

// Timer variables -- the timer is an extra feature I added
// timerInterval holds the setInterval id so we can stop it later
var timerInterval = null;
var elapsedSeconds = 0;
var gameStarted = false;

// DOM element references -- grabbed once in initMap so we do not
// have to call getElementById every single time we need them
var questionNumberSpan;
var questionTotalSpan;
var correctCountSpan;
var timerSpan;
var statusBarDiv;
var questionListItems;
var mapDiv;
var resetButton;


// ---- initMap ----
// Google Maps calls this function automatically once its script loads.
// This is where I set up the map and wire everything together.
//
// Requirement 1.1: The page shows a Google Map of the CSUN campus.
// Requirement 1.6: Panning and zooming are disabled so the user
//                  cannot move the map or cheat by exploring first.

function initMap() {

  // Grab all the HTML elements we will update during the game
  questionNumberSpan = document.getElementById("question-number");
  questionTotalSpan  = document.getElementById("question-total");
  correctCountSpan   = document.getElementById("correct-count");
  timerSpan          = document.getElementById("timer");
  statusBarDiv       = document.getElementById("status-bar");
  mapDiv             = document.getElementById("map");
  resetButton        = document.getElementById("reset-button");
  questionListItems  = document.querySelectorAll("#question-list li");

  // Show the total number of questions in the sidebar
  questionTotalSpan.innerHTML = "5";

  // The midpoint of the campus bounds -- this is where the map starts
  var campusCenter = { lat: 34.2383, lng: -118.5280 };

  // These are the four edges of the area the map is allowed to show.
  // The user cannot scroll or pan outside this box.
  var campusBounds = {
    north: 34.2430,
    south: 34.2330,
    east:  -118.5240,
    west:  -118.5360
  };

  // This styles array turns off every text label on the map.
  var cleanStyle = [
    { featureType: "all",            elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "road",           elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "poi",            elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "transit",        elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "landscape",      elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "water",          elementType: "labels", stylers: [{ visibility: "off" }] }
  ];

  // Create the actual Google Map inside the #map div
  map = new google.maps.Map(mapDiv, {
    center: campusCenter,
    zoom: 17.5,

    // restriction locks the viewport to the campus area.
    // strictBounds: true means the map edges cannot go past campusBounds.
   //restriction: {
    //  latLngBounds: campusBounds,
    //  strictBounds: true
    //},

    // Requirement 1.6: All interaction controls are turned off.
    // The user should only interact with the map by double clicking.
    draggable:             false,
    scrollwheel:           false,
    disableDoubleClickZoom: true,
    keyboardShortcuts:     false,
    zoomControl:           false,
    streetViewControl:     false,
    mapTypeControl:        false,
    fullscreenControl:     false,

    // Apply the label-hiding styles defined above
    styles: cleanStyle
  });

  // Requirement 1.2: Listen for a double click on the map.
  // When the user double clicks, handleMapDoubleClick runs.
  map.addListener("dblclick", handleMapDoubleClick);

  // Fill the quizLocations array with all 5 buildings
  buildQuizLocations();

  // Bold the first question in the sidebar list
  updateQuestionListHighlight();

  // Hook up the Start Over button
  resetButton.addEventListener("click", resetGame);
}


// ---- buildQuizLocations ----
// This function fills the quizLocations array.
// Each entry has a name, a question string, and a LatLngBounds rectangle.
//
// Requirement 1.3: The quiz includes the instructor-assigned location
//                  (Sequoia Hall) plus four locations I chose myself.
// Requirement 1.4: Each location is stored as a LatLngBounds rectangle.
//                  The rectangle is used both for drawing on the map and
//                  for checking if the user's click landed inside it.

function buildQuizLocations() {

  // makeBounds is a helper that creates a LatLngBounds from two corners.
  // swLat/swLng = south-west (bottom-left)
  // neLat/neLng = north-east (top-right)
  function makeBounds(swLat, swLng, neLat, neLng) {
    return new google.maps.LatLngBounds(
      { lat: swLat, lng: swLng },
      { lat: neLat, lng: neLng }
    );
  }

  // Question 1 -- Sequoia Hall (instructor-assigned location)
  quizLocations.push({
    name: "Sequoia Hall",
    question: "Where is Sequoia Hall?",
    bounds: makeBounds(
      34.2401272880422,  -118.52844705192415,
      34.24079600506163, -118.52762709326564
    )
  });

  // Question 2 -- University Library (my choice)
  quizLocations.push({
    name: "University Library",
    question: "Where is the University Library?",
    bounds: makeBounds(
      34.239509413156675, -118.53003414074551,
      34.2403937110296,   -118.5285623728782
    )
  });

  // Question 3 -- Sierra Tower (my choice)
  quizLocations.push({
    name: "Sierra Tower",
    question: "Where is Sierra Tower?",
    bounds: makeBounds(
      34.23845145562707,  -118.53034703930294,
      34.23910406164635,  -118.53009668326304
    )
  });

  // Question 4 -- Student Recreation Center (my choice)
  quizLocations.push({
    name: "Student Recreation Center",
    question: "Where is the Student Recreation Center?",
    bounds: makeBounds(
      34.239319395387106, -118.52518628700064,
      34.24061112895547,  -118.52469615064189
    )
  });

  // Question 5 -- The Soraya (my choice)
  quizLocations.push({
    name: "The Soraya",
    question: "Where is The Soraya?",
    bounds: makeBounds(
      34.23577653148262, -118.52877358762456,
      34.23667349045248, -118.52747304895206
    )
  });
}


// ---- handleMapDoubleClick ----
// Runs every time the user double clicks the map.
//
// Requirement 1.1: The user is prompted to double click on the map
//                  to guess where the current building is located.
// Requirement 1.2: We read the LatLng of the double click using event.latLng.
// Requirement 1.3: We compare that click position to the correct rectangle
//                  using LatLngBounds.contains(), which returns true or false.
// Requirement 1.4: A green rectangle appears if the guess was correct,
//                  or a red rectangle appears showing the right location.
// Requirement 1.5: After all 5 questions, the final score is displayed.

function handleMapDoubleClick(event) {

  // Start the timer on the very first guess (extra feature)
  if (!gameStarted) {
    startTimer();
    gameStarted = true;
  }

  // Do nothing if all questions have already been answered
  if (currentIndex >= quizLocations.length) {
    return;
  }

  // event.latLng is the LatLng object of where the user double clicked
  var clickLatLng = event.latLng;
  var currentLocation = quizLocations[currentIndex];

  // LatLngBounds.contains() checks if the click was inside the rectangle.
  // This is one of the two unique Google Maps API features I used.
  var isInside = currentLocation.bounds.contains(clickLatLng);

  // Draw the green or red rectangle on the map
  drawResultRectangle(currentLocation.bounds, isInside);

  // Update the score and status message based on the result
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

  // Move to the next question
  currentIndex++;

  if (currentIndex < quizLocations.length) {
    // Update the question number in the sidebar and highlight the next item
    questionNumberSpan.innerHTML = (currentIndex + 1);
    updateQuestionListHighlight();
  } else {
    // Requirement 1.5: All 5 questions are done -- show the final score
    endGame();
  }
}


// ---- drawResultRectangle ----
// Draws a colored rectangle on the map over the correct building area.
// Green means the user was right, red means they were wrong.
// We push each rectangle into allRectangles so resetGame can remove them.

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


// ---- Status bar helpers ----
// These three functions update the status bar div with a message
// and swap the CSS class so the background color changes too.

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


// ---- updateQuestionListHighlight ----
// Removes the current-question class from all list items,
// then adds it back to whichever question we are on now.
// This bolds the active question in the sidebar.

function updateQuestionListHighlight() {
  var i;
  for (i = 0; i < questionListItems.length; i++) {
    questionListItems[i].classList.remove("current-question");
  }
  if (currentIndex < questionListItems.length) {
    questionListItems[currentIndex].classList.add("current-question");
  }
}


// ---- markQuestionListItem ----
// After the user answers a question, this replaces the current-question
// highlight with either answered-correct or answered-wrong so they can
// see their history in the sidebar list.

function markQuestionListItem(className) {
  if (currentIndex < questionListItems.length) {
    questionListItems[currentIndex].classList.remove("current-question");
    questionListItems[currentIndex].classList.add(className);
  }
}


// ---- Timer functions (extra feature) ----
// The timer starts on the first double click and stops when the game ends.
// I used setInterval to tick every 1000 ms (one second).
// updateTimerDisplay converts the raw seconds into mm:ss format.

function startTimer() {
  // Guard against starting a second interval if one is already running
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
  // Pad with a leading zero if the number is less than 10 (e.g. 9 -> "09")
  var mm = minutes < 10 ? "0" + minutes : "" + minutes;
  var ss = seconds < 10 ? "0" + seconds : "" + seconds;
  timerSpan.innerHTML = mm + ":" + ss;
}


// ---- flashMap (extra feature) ----
// Briefly adds a CSS class to the map div to trigger a color flash animation.
// The void offsetWidth trick forces the browser to reflow so the animation
// restarts even if the same class was just applied on the previous guess.

function flashMap(className) {
  mapDiv.classList.remove("map-flash-correct");
  mapDiv.classList.remove("map-flash-wrong");
  void mapDiv.offsetWidth;
  mapDiv.classList.add(className);
}


// ---- endGame ----
// Called after the fifth question is answered.
// Stops the timer and shows the final score in the status bar.
//
// Requirement 1.5: The total number of correct and incorrect answers
//                  is displayed to the user at the end of the quiz.

function endGame() {
  stopTimer();
  var wrong = quizLocations.length - correctCount;
  var message = correctCount + " correct, " + wrong + " incorrect in " + timerSpan.innerHTML + ".";
  setStatusNeutral(message + " Click Start Over to play again.");
}


// ---- resetGame ----
// Clears all rectangles off the map, resets every counter and variable
// back to its starting value, and puts the sidebar back to its original state.
// This runs when the user clicks the Start Over button.

function resetGame() {
  var i;

  // Remove every rectangle that was drawn during the game
  for (i = 0; i < allRectangles.length; i++) {
    allRectangles[i].setMap(null);
  }
  allRectangles = [];

  // Reset counters and the sidebar display
  currentIndex = 0;
  correctCount = 0;
  correctCountSpan.innerHTML = "0";
  questionNumberSpan.innerHTML = "1";

  // Clear any answered-correct / answered-wrong classes from the list
  for (i = 0; i < questionListItems.length; i++) {
    questionListItems[i].className = "";
  }
  updateQuestionListHighlight();

  // Reset the status bar message
  setStatusNeutral("Game reset. Double click on the map to guess the first location.");

  // Reset the timer
  stopTimer();
  elapsedSeconds = 0;
  updateTimerDisplay();
  gameStarted = false;
}