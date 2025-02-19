const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Create background music
const backgroundMusic = new Audio('assets/game_music.mp3');
backgroundMusic.loop = true;

// Load images
const portImage = new Image();
portImage.src = 'assets/Port.png';

// Game state
const gameState = {
    repairBoat: {
        x: 0,
        y: 0,
        width: 40,
        height: 40,
        active: false,
        lastSpawnTime: 0,
        spawnInterval: 15000, // Spawn every 15 seconds
        duration: 5000 // Stay for 5 seconds
    },
    boat: {
        x: 50,
        y: canvas.height / 2,
        width: 50,
        height: 30,
        speed: 6,
        fruits: 0,
        hearts: 5,
        portFruits: 0,
        isBlinking: false,
        blinkStart: 0,
        isStunned: false,
        stunnedStart: 0
    },
    port: {
        x: 30,
        y: canvas.height / 2 - 80,
        width: 150,
        height: 150
    },
    fruitIsland: {
        x: canvas.width - 90,
        y: canvas.height / 2 - 50,
        width: 60,
        height: 100
    },
    obstacles: [
        { type: 'shark', x: 300, y: 300, speed: 2 },
        { type: 'tornado', x: 500, y: 200, speed: 4 },
        { type: 'wave', x: 400, y: 400, speed: 1.5 },
        { type: 'shark', x: 200, y: 150, speed: 3 },
        { type: 'wave', x: 600, y: 250, speed: 1 },
        { type: 'tornado', x: 350, y: 450, speed: 5 }
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
    // Don't move if stunned
    if (gameState.boat.isStunned) {
        if (Date.now() - gameState.boat.stunnedStart >= 1000) {
            gameState.boat.isStunned = false;
        }
        return;
    }

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
        obstacle.y += obstacle.speed;
        if (obstacle.y > canvas.height - 30 || obstacle.y < 0) {
            obstacle.speed *= -1;
        }
    });
}

function checkCollisions() {
    // Check repair boat collision
    if (gameState.repairBoat.active && isColliding(gameState.boat, gameState.repairBoat)) {
        handleRepairBoatCollision();
    }

    // Check fruit island collision
    if (isColliding(gameState.boat, gameState.fruitIsland) && gameState.boat.fruits < 3) {
        gameState.boat.fruits = 3;
        updateStats();
    }

    // Check port collision
    if (isColliding(gameState.boat, gameState.port) && gameState.boat.fruits > 0) {
        // Add fruits to port count
        gameState.boat.portFruits += gameState.boat.fruits;
        gameState.boat.fruits = 0;
        updateStats();
        
        // Check win condition
        if (gameState.boat.portFruits >= 25) {
            alert('You won! You delivered 25 fruits safely!');
            resetGame();
        }
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
    // Prevent multiple collisions while blinking
    if (gameState.boat.isBlinking) return;

    gameState.boat.hearts--;
    if (gameState.boat.fruits > 0) {
        // Lose 1-3 fruits randomly
        const fruitsLost = Math.min(gameState.boat.fruits, Math.floor(Math.random() * 3) + 1);
        gameState.boat.fruits -= fruitsLost;
    }
    
    // Start blinking and stunning
    gameState.boat.isBlinking = true;
    gameState.boat.blinkStart = Date.now();
    gameState.boat.isStunned = true;
    gameState.boat.stunnedStart = Date.now();
    
    updateStats();
    
    if (gameState.boat.hearts <= 0) {
        alert('Game Over! You lost all your hearts!');
        resetGame();
    }
}

function updateStats() {
    document.getElementById('hearts').textContent = 'Hearts: ' + '❤️'.repeat(gameState.boat.hearts);
    document.getElementById('fruits').textContent = 'Fruits on boat: ' + gameState.boat.fruits;
    document.getElementById('fruits').textContent += ' | Delivered: ' + gameState.boat.portFruits + '/25';
}

function resetGame() {
    gameState.boat.x = 50;
    gameState.boat.y = canvas.height / 2;
    gameState.boat.fruits = 0;
    gameState.boat.hearts = 5;
    gameState.boat.portFruits = 0;
    updateStats();
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Check if blinking should end
    if (gameState.boat.isBlinking && Date.now() - gameState.boat.blinkStart >= 1000) {
        gameState.boat.isBlinking = false;
    }

    // Draw port
    ctx.drawImage(portImage, gameState.port.x, gameState.port.y, gameState.port.width, gameState.port.height);

    // Draw fruit island
    ctx.fillStyle = 'green';
    ctx.fillRect(gameState.fruitIsland.x, gameState.fruitIsland.y, gameState.fruitIsland.width, gameState.fruitIsland.height);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText('Fruit Island', gameState.fruitIsland.x - 20, gameState.fruitIsland.y - 10);

    // Draw boat (blink every 100ms when hit)
    if (!gameState.boat.isBlinking || Math.floor((Date.now() - gameState.boat.blinkStart) / 100) % 2 === 0) {
        ctx.fillStyle = gameState.boat.isStunned ? 'red' : 'white';
        ctx.fillRect(gameState.boat.x, gameState.boat.y, gameState.boat.width, gameState.boat.height);
    }

    // Draw repair boat if active
    if (gameState.repairBoat.active) {
        ctx.fillStyle = 'pink';
        ctx.fillRect(gameState.repairBoat.x, gameState.repairBoat.y, 
                    gameState.repairBoat.width, gameState.repairBoat.height);
        
        // Draw heart symbol on repair boat
        ctx.fillStyle = 'red';
        ctx.font = '20px Arial';
        ctx.fillText('❤️', gameState.repairBoat.x + 10, gameState.repairBoat.y + 25);
    }

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

function updateRepairBoat() {
    const currentTime = Date.now();
    
    // If repair boat is active, check if it should despawn
    if (gameState.repairBoat.active) {
        if (currentTime - gameState.repairBoat.lastSpawnTime >= gameState.repairBoat.duration) {
            gameState.repairBoat.active = false;
        }
    } 
    // If repair boat is not active, check if it should spawn
    else if (currentTime - gameState.repairBoat.lastSpawnTime >= gameState.repairBoat.spawnInterval) {
        spawnRepairBoat();
    }
}

function spawnRepairBoat() {
    gameState.repairBoat.x = Math.random() * (canvas.width - gameState.repairBoat.width);
    gameState.repairBoat.y = Math.random() * (canvas.height - gameState.repairBoat.height);
    gameState.repairBoat.active = true;
    gameState.repairBoat.lastSpawnTime = Date.now();
}

function handleRepairBoatCollision() {
    if (gameState.boat.hearts < 5) {
        gameState.boat.hearts++;
        updateStats();
    }
    gameState.repairBoat.active = false;
}

function gameLoop() {
    moveBoat();
    moveObstacles();
    updateRepairBoat();
    checkCollisions();
    draw();
    requestAnimationFrame(gameLoop);
}

// Wait for port image to load before starting the game
portImage.onload = () => {
    updateStats(); // Initialize the visual display of hearts
    // Start background music with user interaction
    document.addEventListener('click', () => {
        if (backgroundMusic.paused) {
            backgroundMusic.play().catch(error => {
                console.log("Audio playback failed:", error);
            });
        }
    }, { once: true });
    gameLoop();
};

// Add music controls
document.addEventListener('keydown', (e) => {
    if (e.key === 'm') {
        if (backgroundMusic.paused) {
            backgroundMusic.play();
        } else {
            backgroundMusic.pause();
        }
    }
});
