(function (globalScope) {
  "use strict";

  var DIRECTION_VECTORS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  function clonePosition(position) {
    return { x: position.x, y: position.y };
  }

  function cloneSnake(snake) {
    return snake.map(clonePosition);
  }

  function positionsEqual(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function isWithinBounds(position, gridSize) {
    return (
      position.x >= 0 &&
      position.x < gridSize &&
      position.y >= 0 &&
      position.y < gridSize
    );
  }

  function isOppositeDirection(currentDirection, nextDirection) {
    return (
      (currentDirection === "up" && nextDirection === "down") ||
      (currentDirection === "down" && nextDirection === "up") ||
      (currentDirection === "left" && nextDirection === "right") ||
      (currentDirection === "right" && nextDirection === "left")
    );
  }

  function createDefaultSnake(gridSize) {
    var mid = Math.floor(gridSize / 2);

    return [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
  }

  function getAvailableCells(snake, gridSize) {
    var availableCells = [];

    for (var y = 0; y < gridSize; y += 1) {
      for (var x = 0; x < gridSize; x += 1) {
        var occupied = snake.some(function (segment) {
          return segment.x === x && segment.y === y;
        });

        if (!occupied) {
          availableCells.push({ x: x, y: y });
        }
      }
    }

    return availableCells;
  }

  function spawnFood(snake, gridSize, randomFn) {
    var availableCells = getAvailableCells(snake, gridSize);

    if (availableCells.length === 0) {
      return null;
    }

    var safeRandomFn = typeof randomFn === "function" ? randomFn : Math.random;
    var randomValue = safeRandomFn();
    var boundedValue =
      typeof randomValue === "number" && randomValue >= 0 && randomValue < 1
        ? randomValue
        : 0;
    var index = Math.floor(boundedValue * availableCells.length);

    return clonePosition(availableCells[index]);
  }

  function createInitialState(options) {
    var safeOptions = options || {};
    var gridSize = safeOptions.gridSize || 16;
    var snake = safeOptions.initialSnake
      ? cloneSnake(safeOptions.initialSnake)
      : createDefaultSnake(gridSize);
    var direction = DIRECTION_VECTORS[safeOptions.direction]
      ? safeOptions.direction
      : "right";
    var food = safeOptions.food
      ? clonePosition(safeOptions.food)
      : spawnFood(snake, gridSize, safeOptions.randomFn);

    return {
      gridSize: gridSize,
      snake: snake,
      direction: direction,
      queuedDirection: null,
      food: food,
      score: typeof safeOptions.score === "number" ? safeOptions.score : 0,
      status: safeOptions.status || "ready",
    };
  }

  function queueDirection(state, nextDirection) {
    if (!DIRECTION_VECTORS[nextDirection]) {
      return state;
    }

    if (state.status === "game-over" || state.status === "won") {
      return state;
    }

    if (state.status === "paused") {
      return state;
    }

    if (state.status === "ready") {
      return {
        gridSize: state.gridSize,
        snake: cloneSnake(state.snake),
        direction: nextDirection,
        queuedDirection: null,
        food: state.food ? clonePosition(state.food) : null,
        score: state.score,
        status: "running",
      };
    }

    if (state.queuedDirection || state.direction === nextDirection) {
      return state;
    }

    if (isOppositeDirection(state.direction, nextDirection)) {
      return state;
    }

    return {
      gridSize: state.gridSize,
      snake: cloneSnake(state.snake),
      direction: state.direction,
      queuedDirection: nextDirection,
      food: state.food ? clonePosition(state.food) : null,
      score: state.score,
      status: state.status,
    };
  }

  function startGame(state) {
    if (state.status !== "ready" && state.status !== "paused") {
      return state;
    }

    return {
      gridSize: state.gridSize,
      snake: cloneSnake(state.snake),
      direction: state.direction,
      queuedDirection: state.queuedDirection,
      food: state.food ? clonePosition(state.food) : null,
      score: state.score,
      status: "running",
    };
  }

  function togglePause(state) {
    if (state.status !== "running" && state.status !== "paused") {
      return state;
    }

    return {
      gridSize: state.gridSize,
      snake: cloneSnake(state.snake),
      direction: state.direction,
      queuedDirection: state.queuedDirection,
      food: state.food ? clonePosition(state.food) : null,
      score: state.score,
      status: state.status === "paused" ? "running" : "paused",
    };
  }

  function restartGame(state, randomFn) {
    return createInitialState({
      gridSize: state.gridSize,
      randomFn: randomFn,
    });
  }

  function stepGame(state, randomFn) {
    if (state.status !== "running") {
      return state;
    }

    var activeDirection = state.queuedDirection || state.direction;
    var vector = DIRECTION_VECTORS[activeDirection];
    var currentHead = state.snake[0];
    var nextHead = {
      x: currentHead.x + vector.x,
      y: currentHead.y + vector.y,
    };

    if (!isWithinBounds(nextHead, state.gridSize)) {
      return {
        gridSize: state.gridSize,
        snake: cloneSnake(state.snake),
        direction: activeDirection,
        queuedDirection: null,
        food: state.food ? clonePosition(state.food) : null,
        score: state.score,
        status: "game-over",
      };
    }

    var isEating = state.food ? positionsEqual(nextHead, state.food) : false;
    var remainingBody = isEating
      ? cloneSnake(state.snake)
      : cloneSnake(state.snake.slice(0, -1));

    var collidesWithBody = remainingBody.some(function (segment) {
      return positionsEqual(segment, nextHead);
    });

    if (collidesWithBody) {
      return {
        gridSize: state.gridSize,
        snake: cloneSnake(state.snake),
        direction: activeDirection,
        queuedDirection: null,
        food: state.food ? clonePosition(state.food) : null,
        score: state.score,
        status: "game-over",
      };
    }

    var nextSnake = [nextHead].concat(remainingBody);
    var nextFood = state.food ? clonePosition(state.food) : null;
    var nextScore = state.score;
    var nextStatus = "running";

    if (isEating) {
      nextScore += 1;
      nextFood = spawnFood(nextSnake, state.gridSize, randomFn);

      if (!nextFood) {
        nextStatus = "won";
      }
    }

    return {
      gridSize: state.gridSize,
      snake: nextSnake,
      direction: activeDirection,
      queuedDirection: null,
      food: nextFood,
      score: nextScore,
      status: nextStatus,
    };
  }

  var SnakeCore = {
    DIRECTION_VECTORS: DIRECTION_VECTORS,
    createInitialState: createInitialState,
    getAvailableCells: getAvailableCells,
    isOppositeDirection: isOppositeDirection,
    positionsEqual: positionsEqual,
    queueDirection: queueDirection,
    restartGame: restartGame,
    spawnFood: spawnFood,
    startGame: startGame,
    stepGame: stepGame,
    togglePause: togglePause,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = SnakeCore;
  }

  globalScope.SnakeCore = SnakeCore;
})(typeof globalThis !== "undefined" ? globalThis : window);
