console.log("game.js script loaded"); // Debug: Check if script file executes

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.boat = null;
        this.port = null;
        this.fruitIsland = null;
        this.obstacles = null;
        this.repairBoatGroup = null;
        this.cursors = null;
        this.heartsText = null;
        this.fruitsText = null;
        this.backgroundMusic = null;
        this.repairBoatTimer = null; // Keep track of the timer

        // Game constants
        this.BOAT_SPEED = 180; // pixels per second
        this.MAX_HEARTS = 5;
        this.FRUITS_PER_TRIP = 3;
        this.FRUITS_TO_WIN = 25;
        this.OBSTACLE_SPEED_MAP = {
            'shark': 120,
            'tornado': 240,
            'wave': 90
        };
        this.REPAIR_BOAT_SPAWN_INTERVAL = 15000; // ms
        this.REPAIR_BOAT_DURATION = 5000; // ms
        this.BLINK_DURATION = 1000; // ms
        this.STUN_DURATION = 1000; // ms
    }

    preload() {
        this.load.image('port', 'assets/Port.png');
        this.load.audio('game_music', 'assets/game_music.mp3');
        this.load.image('boat', 'assets/boat.png'); // Load boat image
        this.load.image('shark_image', 'assets/shark.png'); // Load shark image

        // Generate simple textures for missing assets
        this.generateTextures();
    }

    generateTextures() {
        // Boat texture is now loaded from image

        // Fruit Island Texture (Green Rectangle)
        let islandGraphics = this.make.graphics({ fillStyle: { color: 0x00ff00 } });
        islandGraphics.fillRect(0, 0, 60, 100);
        islandGraphics.generateTexture('island_texture', 60, 100);
        islandGraphics.destroy();

        // Obstacle Textures (Colored Rectangles)
        // Shark texture is now loaded from image

        let tornadoGraphics = this.make.graphics({ fillStyle: { color: 0xA9A9A9 } }); // Dark Grey
        tornadoGraphics.fillRect(0, 0, 30, 30);
        tornadoGraphics.generateTexture('tornado', 30, 30);
        tornadoGraphics.destroy();

        let waveGraphics = this.make.graphics({ fillStyle: { color: 0x0000ff } }); // Blue
        waveGraphics.fillRect(0, 0, 30, 30);
        waveGraphics.generateTexture('wave', 30, 30);
        waveGraphics.destroy();

        // Repair Boat Texture (Pink Rectangle with Red Heart)
        let repairGraphics = this.make.graphics();
        repairGraphics.fillStyle(0xffc0cb); // Pink
        repairGraphics.fillRect(0, 0, 40, 40);
        repairGraphics.fillStyle(0xff0000); // Red
        // Draw a simple red circle as a placeholder for the heart
        repairGraphics.fillCircle(20, 20, 10); // Center x, y, radius
        repairGraphics.generateTexture('repair_boat_texture', 40, 40);
        repairGraphics.destroy();
    }

    create() {
        // --- Setup ---
        const gameWidth = this.sys.game.config.width;
        const gameHeight = this.sys.game.config.height;

        // Enable physics
        this.physics.world.setBounds(0, 0, gameWidth, gameHeight);

        // --- Music ---
        // Add music only if not already loaded/playing from a previous scene instance
        if (!this.sound.get('game_music')) {
            this.backgroundMusic = this.sound.add('game_music', { loop: true, volume: 0.5 });
        } else {
            this.backgroundMusic = this.sound.get('game_music');
            // Ensure it's playing if returning to the scene after pause/stop
            if (!this.backgroundMusic.isPlaying) {
                 this.backgroundMusic.play(); // Or resume() if pause is preferred
            }
        }

        // Play music on first pointer down interaction (safer across restarts)
        if (!this.sound.locked) { // Check if audio context is already unlocked
             if (!this.backgroundMusic.isPlaying) {
                 this.backgroundMusic.play();
             }
        } else {
            // If locked, wait for unlock (usually happens on first user interaction)
            this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
                 if (!this.backgroundMusic.isPlaying) {
                    this.backgroundMusic.play();
                 }
            });
        }

        // Music toggle key (ensure listener isn't added multiple times on restart)
        this.input.keyboard.off('keydown-M'); // Remove previous listener if exists
        this.input.keyboard.on('keydown-M', () => {
            if (this.backgroundMusic.isPlaying) {
                this.backgroundMusic.pause();
            } else {
                // Use resume if paused, play if stopped/never started
                 if (this.backgroundMusic.isPaused) {
                    this.backgroundMusic.resume();
                 } else {
                    // This handles the case where it was stopped or never played
                    this.backgroundMusic.play();
                 }
            }
        });


        // --- Game Objects ---
        // Port (adjust position based on image size and desired location)
        this.port = this.physics.add.staticImage(105, gameHeight / 2, 'port'); // Centered x = 30 + 150/2 = 105
        this.port.setDisplaySize(150, 150); // Set display size to match original intent

        // Fruit Island (adjust position)
        this.fruitIsland = this.physics.add.staticImage(gameWidth - 60, gameHeight / 2, 'island_texture'); // Centered x = (W-90) + 60/2 = W-60
        this.add.text(this.fruitIsland.x, this.fruitIsland.y - this.fruitIsland.height/2 - 15, 'Fruit Island', { fontSize: '16px', fill: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);


        // Boat
        this.boat = this.physics.add.sprite(50 + 25, gameHeight / 2, 'boat'); // Use 'boat' image key
        this.boat.setDisplaySize(100, 100); // Increased display size
        this.boat.setCollideWorldBounds(true);
        this.boat.setBounce(0); // No bouncing off walls
        // Adjust physics body size/offset if needed for better collision (example)
        this.boat.body.setSize(80, 80); // Increased physics body size
        // this.boat.body.setOffset(10, 10); // Example offset if needed, adjust proportionally
        this.boat.setDataEnabled();
        this.resetBoatState(); // Initialize hearts, fruits etc.

        // Obstacles Group
        this.obstacles = this.physics.add.group();
        this.createObstacles();

        // Repair Boat Group (will be populated by timer)
        this.repairBoatGroup = this.physics.add.group();

        // --- Input ---
        console.log("create(): Initializing keyboard cursors..."); // Debug: Check if create reaches this point
        this.cursors = this.input.keyboard.createCursorKeys();

        // --- UI ---
        const textStyle = { fontSize: '20px', fill: '#fff', stroke: '#000', strokeThickness: 4 };
        this.heartsText = this.add.text(10, 10, '', textStyle);
        this.fruitsText = this.add.text(10, 40, '', textStyle);
        this.updateStatsUI();

        // --- Collisions ---
        this.physics.add.overlap(this.boat, this.fruitIsland, this.collectFruit, null, this);
        this.physics.add.overlap(this.boat, this.port, this.deliverFruit, null, this);
        this.physics.add.collider(this.boat, this.obstacles, this.hitObstacle, null, this);
        this.physics.add.overlap(this.boat, this.repairBoatGroup, this.hitRepairBoat, null, this);

        // --- Timers ---
        // Ensure timer isn't added multiple times on restart
        if (this.repairBoatTimer) this.repairBoatTimer.remove();
        this.repairBoatTimer = this.time.addEvent({
            delay: this.REPAIR_BOAT_SPAWN_INTERVAL,
            callback: this.spawnRepairBoat,
            callbackScope: this,
            loop: true
        });
    }

    resetBoatState() {
        this.boat.data.set('hearts', this.MAX_HEARTS);
        this.boat.data.set('fruits', 0);
        this.boat.data.set('portFruits', 0);
        this.boat.data.set('isBlinking', false);
        this.boat.data.set('isStunned', false);
        // Clear any existing timers associated with the boat's data
        if (this.boat.data.get('blinkTimer')) this.boat.data.get('blinkTimer').remove();
        if (this.boat.data.get('stunTimer')) this.boat.data.get('stunTimer').remove();
        this.boat.data.set('blinkTimer', null);
        this.boat.data.set('stunTimer', null);
        this.boat.clearTint();
        this.boat.setVisible(true);
        // Reset position
        this.boat.setPosition(50 + 25, this.sys.game.config.height / 2);
        this.boat.setVelocity(0,0); // Stop any movement
    }

    createObstacles() {
        // Clear existing obstacles if restarting scene
        this.obstacles.clear(true, true);

        const initialObstacles = [
            { type: 'shark', x: 300, y: 300 },
            { type: 'tornado', x: 500, y: 200 },
            { type: 'wave', x: 400, y: 400 },
            { type: 'shark', x: 200, y: 150 },
            { type: 'wave', x: 600, y: 250 },
            { type: 'tornado', x: 350, y: 450 }
        ];

        initialObstacles.forEach(obsData => {
            const speed = this.OBSTACLE_SPEED_MAP[obsData.type] || 100;
            // Ensure obstacle stays within reasonable vertical bounds initially
            const initialY = Phaser.Math.Clamp(obsData.y, 30, this.sys.game.config.height - 30);
            // Use the correct texture based on type
            const textureKey = obsData.type === 'shark' ? 'shark_image' : obsData.type;
            const obstacle = this.obstacles.create(obsData.x, initialY, textureKey);

            // Set specific properties for sharks
            if (obsData.type === 'shark') {
                obstacle.setDisplaySize(120, 60); // Increased display size for shark
                obstacle.body.setSize(100, 50); // Increased physics body for shark
            } else {
                 // Keep original size for other obstacles (rectangles)
                 obstacle.body.setSize(30, 30);
            }

            obstacle.setVelocityY(speed * (Math.random() < 0.5 ? 1 : -1)); // Random initial direction
            obstacle.setCollideWorldBounds(true);
            obstacle.setBounceY(1); // Bounce off top/bottom
            obstacle.setImmovable(true); // Boat doesn't push obstacles
        });
    }

    update(time, delta) {
        console.log(`Update running - Time: ${time.toFixed(0)}`); // Debug: Check if update loop runs
        // The update loop runs regardless of physics state (paused/running)
        // We handle paused physics within specific actions if needed (e.g., endGame)

        this.handleInput();
        this.handleBlinking(time); // Pass time for blink calculation
    }

    handleInput() {
        console.log("handleInput called"); // Debug: Check if function runs
        const isStunned = this.boat.data.get('isStunned');
        console.log("Is Stunned:", isStunned); // Debug: Check stun state

        // Stop movement if stunned
        if (isStunned) {
            this.boat.setVelocity(0);
            return;
        }

        let targetVelocityX = 0;
        let targetVelocityY = 0;

        if (this.cursors.left.isDown) {
            targetVelocityX = -this.BOAT_SPEED;
        } else if (this.cursors.right.isDown) {
            targetVelocityX = this.BOAT_SPEED;
        }

        if (this.cursors.up.isDown) {
            targetVelocityY = -this.BOAT_SPEED;
        } else if (this.cursors.down.isDown) {
            targetVelocityY = this.BOAT_SPEED;
        }

        console.log(`Cursors: L=${this.cursors.left.isDown}, R=${this.cursors.right.isDown}, U=${this.cursors.up.isDown}, D=${this.cursors.down.isDown}`); // Debug: Check key states
        console.log(`Calculated Velocity: X=${targetVelocityX}, Y=${targetVelocityY}`); // Debug: Check calculated velocity

        this.boat.setVelocity(targetVelocityX, targetVelocityY);

        // Normalize diagonal speed
        if (targetVelocityX !== 0 && targetVelocityY !== 0) {
            this.boat.body.velocity.normalize().scale(this.BOAT_SPEED);
        }
    }

     handleBlinking(time) { // Use the time parameter from update
        if (this.boat.data.get('isBlinking')) {
            // Simple blink effect: toggle visibility every 100ms
            const blinkRate = 100;
            // Use the blinkStartTime stored in data
            const blinkStartTime = this.boat.data.get('blinkStartTime') || 0;
            this.boat.setVisible(Math.floor((time - blinkStartTime) / blinkRate) % 2 === 0);
        } else {
            // Ensure boat is visible when not blinking
            if (!this.boat.visible) {
                this.boat.setVisible(true);
            }
        }
    }

    collectFruit(boat, island) {
        if (boat.data.get('fruits') < this.FRUITS_PER_TRIP) {
            boat.data.set('fruits', this.FRUITS_PER_TRIP);
            this.updateStatsUI();
            // Optional: Add a sound effect
            // this.sound.play('collect_sound');
        }
    }

    deliverFruit(boat, port) {
        const currentFruits = boat.data.get('fruits');
        if (currentFruits > 0) {
            const currentPortFruits = boat.data.get('portFruits');
            const newPortFruits = currentPortFruits + currentFruits;
            boat.data.set('portFruits', newPortFruits);
            boat.data.set('fruits', 0);
            this.updateStatsUI();
            // Optional: Add a sound effect
            // this.sound.play('deliver_sound');

            // Check win condition
            if (newPortFruits >= this.FRUITS_TO_WIN) {
                this.winGame();
            }
        }
    }

    hitObstacle(boat, obstacle) {
        if (boat.data.get('isBlinking')) {
            return; // Invincible while blinking
        }

        // --- State Updates ---
        let currentHearts = boat.data.get('hearts');
        currentHearts--;
        boat.data.set('hearts', currentHearts);

        let currentFruits = boat.data.get('fruits');
        if (currentFruits > 0) {
            const fruitsLost = Math.min(currentFruits, Phaser.Math.Between(1, 3));
            boat.data.set('fruits', currentFruits - fruitsLost);
        }

        boat.data.set('isBlinking', true);
        boat.data.set('isStunned', true);
        boat.data.set('blinkStartTime', this.time.now); // Store start time for blinking calculation
        boat.setTint(0xff0000); // Tint red while stunned/hit

        // --- Timers for Effects ---
        // Clear existing timers if any (prevents issues with rapid hits)
        if (boat.data.get('blinkTimer')) boat.data.get('blinkTimer').remove();
        if (boat.data.get('stunTimer')) boat.data.get('stunTimer').remove();

        // Stop blinking after duration
        const blinkTimer = this.time.delayedCall(this.BLINK_DURATION, () => {
            boat.data.set('isBlinking', false);
            boat.setVisible(true); // Ensure visible at the end
            // Only remove tint if stun is also over
            if (!boat.data.get('isStunned')) {
                 boat.clearTint();
            }
            boat.data.set('blinkTimer', null);
        }, [], this);
        boat.data.set('blinkTimer', blinkTimer);


        // Stop stun after duration
         const stunTimer = this.time.delayedCall(this.STUN_DURATION, () => {
            boat.data.set('isStunned', false);
             // Only remove tint if blinking is also over
            if (!boat.data.get('isBlinking')) {
                 boat.clearTint();
            }
            boat.data.set('stunTimer', null);
        }, [], this);
        boat.data.set('stunTimer', stunTimer);


        // --- UI & Game Over Check ---
        this.updateStatsUI();
        // Optional: Add a sound effect
        // this.sound.play('hit_sound');

        if (currentHearts <= 0) {
            this.gameOver();
        }
    }

    spawnRepairBoat() {
        // Don't spawn if game is paused (e.g., game over screen)
        if (!this.physics.world.running) return;

        const gameWidth = this.sys.game.config.width;
        const gameHeight = this.sys.game.config.height;

        const x = Phaser.Math.Between(50, gameWidth - 50); // Avoid edges
        const y = Phaser.Math.Between(50, gameHeight - 50);

        const repairBoat = this.repairBoatGroup.create(x, y, 'repair_boat_texture');
        repairBoat.setImmovable(true); // So overlap works correctly

        // Despawn after duration
        this.time.delayedCall(this.REPAIR_BOAT_DURATION, () => {
            // Check if the boat still exists and is active before trying to destroy
             if (repairBoat && repairBoat.active) {
                repairBoat.destroy();
            }
        }, [], this);
    }

    hitRepairBoat(boat, repairBoat) {
        let currentHearts = boat.data.get('hearts');
        if (currentHearts < this.MAX_HEARTS) {
            boat.data.set('hearts', currentHearts + 1);
            this.updateStatsUI();
            // Optional: Add a sound effect
            // this.sound.play('heal_sound');
        }
        repairBoat.destroy(); // Remove the repair boat once collected
    }

    updateStatsUI() {
        const hearts = this.boat.data.get('hearts');
        const fruits = this.boat.data.get('fruits');
        const portFruits = this.boat.data.get('portFruits');

        this.heartsText.setText('Hearts: ' + '❤️'.repeat(Math.max(0, hearts))); // Ensure hearts don't go below 0 visually
        this.fruitsText.setText(`Fruits: ${fruits} | Delivered: ${portFruits}/${this.FRUITS_TO_WIN}`);
    }

    // --- Game Over / Win ---
    endGame(message, color) {
        this.physics.pause(); // Pause physics simulation
        if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
            this.backgroundMusic.pause(); // Pause instead of stop for potential restart
        }
        this.boat.setVelocity(0,0); // Stop boat movement visually
        this.boat.setTint(0xff0000); // Red tint on game over/win for consistency

        // Clear timers and remove active game objects that shouldn't persist
        if (this.repairBoatTimer) this.repairBoatTimer.remove();
        if (this.boat.data.get('blinkTimer')) this.boat.data.get('blinkTimer').remove();
        if (this.boat.data.get('stunTimer')) this.boat.data.get('stunTimer').remove();
        this.repairBoatGroup.clear(true, true); // Remove active repair boats

        // Display End Game text
        const endTextStyle = { fontSize: '48px', fill: color, stroke: '#000', strokeThickness: 6, align: 'center' };
        const restartTextStyle = { fontSize: '24px', fill: '#fff', stroke: '#000', strokeThickness: 4, align: 'center' };

        this.add.text(this.sys.game.config.width / 2, this.sys.game.config.height / 2 - 50, message, endTextStyle).setOrigin(0.5);
        this.add.text(this.sys.game.config.width / 2, this.sys.game.config.height / 2 + 20, 'Click to Restart', restartTextStyle).setOrigin(0.5);

        // Use 'pointerdown' which works for both mouse and touch
        this.input.once('pointerdown', () => {
            // Reset relevant sound state before restarting
            if (this.backgroundMusic && this.backgroundMusic.isPaused) {
                 // Decide if music should resume on restart or require interaction again
                 // this.backgroundMusic.resume(); // Option 1: Resume immediately
                 // Option 2: Do nothing, let the create() logic handle interaction start
            }
            this.scene.restart();
        });
    }

    gameOver() {
        this.endGame('GAME OVER', '#ff0000'); // Red color for game over
    }

     winGame() {
        this.endGame('YOU WON!', '#00ff00'); // Green color for win
    }
}

// --- Phaser Game Configuration ---
const config = {
    type: Phaser.AUTO, // Use WebGL if available, otherwise Canvas
    width: 800,
    height: 600,
    backgroundColor: '#0055AA', // Set canvas background color
    // parent: 'phaser-game-container', // Optional: Specify a div ID to contain the canvas
    physics: {
        default: 'arcade',
        arcade: {
            // debug: true, // Set true for physics debugging visuals (bounding boxes, velocity)
            gravity: { y: 0 } // Top-down game, no gravity needed
        }
    },
    scene: [MainScene], // Add scene to the game
    // Ensure audio context is created on user interaction if needed
    audio: {
        disableWebAudio: false // Use Web Audio API if available
    }
};

// --- Initialize Game ---
// Wait for the DOM to be ready before creating the game instance
window.onload = () => {
    const game = new Phaser.Game(config);
};
