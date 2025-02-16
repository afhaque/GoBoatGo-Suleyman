const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Game state
const gameState = {
    boat: {
        x: 50,
        y: canvas.height / 2,
        width: 50,
        height: 30,
        speed:4,
        fruits: 0,
        hearts: 3
    },
    port: {
        x: 30,
        y: 0,
        width: 60,
        height: 900
    },
    fruitIsland: {
        x: canvas.width - 90,
        y: canvas.height / 2 - 50,
        width: 60,
        height: 100
    },
    obstacles: [
        { type: 'shark', x: 300, y: 300, speed: 1 },
        { type: 'tornado', x: 500, y: 200, speed: 3 },
        { type: 'wave', x: 400, y: 400, speed: 1.5 }
    ]
};

// Keyboard state
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// Event listeners
document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

function moveBoat() {
    if (keys.ArrowUp) gameState.boat.y -= gameState.boat.speed;
    if (keys.ArrowDown) gameState.boat.y += gameState.boat.speed;
    if (keys.ArrowLeft) gameState.boat.x -= gameState.boat.speed;
    if (keys.ArrowRight) gameState.boat.x += gameState.boat.speed;

    // Keep boat in bounds
    gameState.boat.x = Math.max(0, Math.min(canvas.width - gameState.boat.width, gameState.boat.x));
    gameState.boat.y = Math.max(0, Math.min(canvas.height - gameState.boat.height, gameState.boat.y));
}

function moveObstacles() {
    gameState.obstacles.forEach(obstacle => {
        switch(obstacle.type) {
            case 'shark':
                obstacle.y += obstacle.speed;
                if (obstacle.y > canvas.height || obstacle.y < 0) obstacle.speed *= -1;
                break;
            case 'tornado':
                obstacle.x += obstacle.speed;
                if (obstacle.x > canvas.width || obstacle.x < 0) obstacle.speed *= -1;
                break;
            case 'wave':
                obstacle.x -= obstacle.speed;
                if (obstacle.x < 0) obstacle.x = canvas.width;
                break;
        }
    });
}

function checkCollisions() {
    // Check fruit island collision
    if (isColliding(gameState.boat, gameState.fruitIsland) && gameState.boat.fruits < 3) {
        gameState.boat.fruits = 3;
        updateStats();
    }

    // Check port collision
    if (isColliding(gameState.boat, gameState.port) && gameState.boat.fruits === 3) {
        // Win condition
        alert('You won! You delivered all fruits safely!');
        resetGame();
    }

    // Check obstacle collisions
    gameState.obstacles.forEach(obstacle => {
        if (isCollidingWithObstacle(gameState.boat, obstacle)) {
            handleObstacleCollision(obstacle);
        }
    });
}

function isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function isCollidingWithObstacle(boat, obstacle) {
    const obstacleSize = 30;
    return boat.x < obstacle.x + obstacleSize &&
           boat.x + boat.width > obstacle.x &&
           boat.y < obstacle.y + obstacleSize &&
           boat.y + boat.height > obstacle.y;
}

function handleObstacleCollision(obstacle) {
    gameState.boat.hearts--;
    if (gameState.boat.fruits > 0) gameState.boat.fruits--;
    
    // Reset boat position
    gameState.boat.x = 50;
    gameState.boat.y = canvas.height / 2;
    
    updateStats();
    
    if (gameState.boat.hearts <= 0) {
        alert('Game Over! You lost all your hearts!');
        resetGame();
    }
}

function updateStats() {
    document.getElementById('hearts').textContent = 'Hearts: ' + '❤️'.repeat(gameState.boat.hearts);
    document.getElementById('fruits').textContent = 'Fruits: ' + gameState.boat.fruits;
}

function resetGame() {
    gameState.boat.x = 50;
    gameState.boat.y = canvas.height / 2;
    gameState.boat.fruits = 0;
    gameState.boat.hearts = 3;
    updateStats();
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw port
    ctx.fillStyle = 'brown';
    ctx.fillRect(gameState.port.x, gameState.port.y, gameState.port.width, gameState.port.height);

    // Draw fruit island
    ctx.fillStyle = 'green';
    ctx.fillRect(gameState.fruitIsland.x, gameState.fruitIsland.y, gameState.fruitIsland.width, gameState.fruitIsland.height);

    // Draw boat
    ctx.fillStyle = 'white';
    ctx.fillRect(gameState.boat.x, gameState.boat.y, gameState.boat.width, gameState.boat.height);

    // Draw obstacles
    gameState.obstacles.forEach(obstacle => {
        switch(obstacle.type) {
            case 'shark':
                ctx.fillStyle = 'grey';
                break;
            case 'tornado':
                ctx.fillStyle = 'darkgrey';
                break;
            case 'wave':
                ctx.fillStyle = 'blue';
                break;
        }
        ctx.fillRect(obstacle.x, obstacle.y, 30, 30);
    });
}

function gameLoop() {
    moveBoat();
    moveObstacles();
    checkCollisions();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();
