(function () {
  "use strict";

  var boardElement = document.getElementById("board");
  var scoreElement = document.getElementById("score");
  var statusElement = document.getElementById("status");
  var gameShellElement = document.querySelector(".game-shell");
  var startButton = document.getElementById("start-button");
  var pauseButton = document.getElementById("pause-button");
  var installButton = document.getElementById("install-button");
  var controlButtons = Array.prototype.slice.call(
    document.querySelectorAll("[data-direction]")
  );
  var installPromptEvent = null;

  var TICK_MS = 140;
  var GRID_SIZE = 16;
  var cells = [];
  var state = window.SnakeCore.createInitialState({ gridSize: GRID_SIZE });

  function buildBoard(gridSize) {
    boardElement.innerHTML = "";
    boardElement.style.setProperty("--grid-size", String(gridSize));
    cells = [];

    for (var index = 0; index < gridSize * gridSize; index += 1) {
      var cell = document.createElement("div");
      cell.className = "cell";
      cell.setAttribute("role", "presentation");
      boardElement.appendChild(cell);
      cells.push(cell);
    }
  }

  function getCellIndex(position) {
    return position.y * state.gridSize + position.x;
  }

  function getStatusText(currentState) {
    switch (currentState.status) {
      case "running":
        return "Traverse the wilderness with Arrow keys or WASD.";
      case "paused":
        return "Camp paused. Press Space, P, or Pause to resume.";
      case "game-over":
        return "The wilderness won this round. Restart to redeploy.";
      case "won":
        return "You conquered the whole wild map.";
      case "ready":
      default:
        return "Press Start, Arrow keys, or WASD to enter the jungle.";
    }
  }

  function renderBoard() {
    cells.forEach(function (cell) {
      cell.className = "cell";
    });

    state.snake.forEach(function (segment, index) {
      var snakeIndex = getCellIndex(segment);

      if (!cells[snakeIndex]) {
        return;
      }

      cells[snakeIndex].classList.add(index === 0 ? "cell-head" : "cell-snake");
    });

    if (state.food) {
      var foodIndex = getCellIndex(state.food);

      if (cells[foodIndex]) {
        cells[foodIndex].classList.add("cell-food");
      }
    }
  }

  function render() {
    scoreElement.textContent = String(state.score);
    statusElement.textContent = getStatusText(state);
    statusElement.dataset.state = state.status;
    gameShellElement.dataset.state = state.status;
    startButton.textContent =
      state.status === "ready" ? "Start Game" : "Restart Game";
    pauseButton.disabled = state.status === "ready" || state.status === "game-over" || state.status === "won";
    pauseButton.textContent = state.status === "paused" ? "Resume" : "Pause";
    renderBoard();
  }

  function updateInstallButton() {
    if (!installButton) {
      return;
    }

    var isStandalone =
      window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches;

    installButton.hidden = installPromptEvent === null || isStandalone;
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function () {
        return null;
      });
    });
  }

  function startNewGame() {
    state = window.SnakeCore.restartGame(state, Math.random);
    state = window.SnakeCore.startGame(state);
    render();
  }

  function handleDirection(nextDirection) {
    var nextState = window.SnakeCore.queueDirection(state, nextDirection);

    if (nextState !== state) {
      state = nextState;
      render();
    }
  }

  function handleKeydown(event) {
    var key = event.key.toLowerCase();
    var directionMap = {
      arrowup: "up",
      w: "up",
      arrowdown: "down",
      s: "down",
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
    };

    if (directionMap[key]) {
      event.preventDefault();
      handleDirection(directionMap[key]);
      return;
    }

    if (key === " " || key === "p") {
      event.preventDefault();
      state = window.SnakeCore.togglePause(state);
      render();
      return;
    }

    if (key === "enter" || key === "r") {
      event.preventDefault();
      startNewGame();
    }
  }

  function attachEvents() {
    document.addEventListener("keydown", handleKeydown);

    startButton.addEventListener("click", startNewGame);
    pauseButton.addEventListener("click", function () {
      state = window.SnakeCore.togglePause(state);
      render();
    });

    controlButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        handleDirection(button.getAttribute("data-direction"));
      });
    });

    if (installButton) {
      installButton.addEventListener("click", function () {
        if (!installPromptEvent) {
          return;
        }

        installPromptEvent.prompt();
        installPromptEvent.userChoice.finally(function () {
          installPromptEvent = null;
          updateInstallButton();
        });
      });
    }

    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      installPromptEvent = event;
      updateInstallButton();
    });

    window.addEventListener("appinstalled", function () {
      installPromptEvent = null;
      updateInstallButton();
    });
  }

  function startLoop() {
    window.setInterval(function () {
      var nextState = window.SnakeCore.stepGame(state, Math.random);

      if (nextState !== state) {
        state = nextState;
        render();
      }
    }, TICK_MS);
  }

  buildBoard(state.gridSize);
  attachEvents();
  render();
  updateInstallButton();
  registerServiceWorker();
  startLoop();
})();
