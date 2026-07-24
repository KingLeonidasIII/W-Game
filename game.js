// Chrono Dash - Endless Runner with Time Control
// A game by Vibe Code for KingLeonidasIII

// ========== GAME CONSTANTS ==========
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const GRAVITY = 0.8;
const JUMP_FORCE = -12;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 50;
const GROUND_HEIGHT = 60;
const BASE_SPEED = 5;
const SPEED_INCREASE = 0.002;
const SLOW_MO_FACTOR = 0.4;
const TIME_ENERGY_MAX = 100;
const TIME_ENERGY_DRAIN = 0.5;
const TIME_ENERGY_REGEN = 0.2;
const REWIND_DURATION = 2.5; // seconds
const MAX_REWINDS = 3;
const REWIND_COOLDOWN = 1000; // ms
const OBSTACLE_SPAWN_RATE = 150; // frames
const COIN_SPAWN_RATE = 200; // frames
const PLATFORM_SPAWN_RATE = 300; // frames

// ========== GAME STATE ==========
const gameState = {
    canvas: null,
    ctx: null,
    running: false,
    paused: false,
    score: 0,
    highScore: localStorage.getItem('chronoDashHighScore') || 0,
    speed: BASE_SPEED,
    timeEnergy: TIME_ENERGY_MAX,
    rewindsLeft: MAX_REWINDS,
    lastRewindTime: 0,
    isSlowMo: false,
    isRewinding: false,
    rewindProgress: 0,
    rewindPositions: [],
    gameOver: false,
    startScreen: true,
    // Player state
    player: {
        x: 100,
        y: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT,
        velY: 0,
        isJumping: false,
        color: '#00ffff',
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT
    },
    // World state
    groundY: GAME_HEIGHT - GROUND_HEIGHT,
    obstacles: [],
    coins: [],
    platforms: [],
    particles: [],
    // Input state
    keys: {
        Space: false,
        ArrowUp: false,
        Shift: false,
        KeyR: false,
        Escape: false
    },
    // Time tracking
    frameCount: 0,
    lastObstacleSpawn: 0,
    lastCoinSpawn: 0,
    lastPlatformSpawn: 0,
    // Rewind buffer
    rewindBuffer: [],
    rewindBufferIndex: 0
};

// ========== INITIALIZATION ==========
function init() {
    gameState.canvas = document.getElementById('gameCanvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    
    // Set canvas size
    gameState.canvas.width = GAME_WIDTH;
    gameState.canvas.height = GAME_HEIGHT;
    
    // Event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('click', handleClick);
    
    // Button events
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', resetGame);
    
    // Start screen
    showStartScreen();
    
    // Game loop
    requestAnimationFrame(gameLoop);
}

function showStartScreen() {
    gameState.startScreen = true;
    gameState.running = false;
    document.getElementById('startScreen').style.display = 'block';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('ui').style.display = 'none';
}

function hideStartScreen() {
    gameState.startScreen = false;
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('ui').style.display = 'block';
}

function startGame() {
    resetGame();
    hideStartScreen();
    gameState.running = true;
}

function resetGame() {
    // Reset player
    gameState.player.x = 100;
    gameState.player.y = GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT;
    gameState.player.velY = 0;
    gameState.player.isJumping = false;
    
    // Reset game state
    gameState.score = 0;
    gameState.speed = BASE_SPEED;
    gameState.timeEnergy = TIME_ENERGY_MAX;
    gameState.rewindsLeft = MAX_REWINDS;
    gameState.isSlowMo = false;
    gameState.isRewinding = false;
    gameState.rewindProgress = 0;
    gameState.gameOver = false;
    gameState.frameCount = 0;
    gameState.lastObstacleSpawn = 0;
    gameState.lastCoinSpawn = 0;
    gameState.lastPlatformSpawn = 0;
    
    // Clear world
    gameState.obstacles = [];
    gameState.coins = [];
    gameState.platforms = [];
    gameState.particles = [];
    gameState.rewindBuffer = [];
    gameState.rewindBufferIndex = 0;
    
    // Hide game over
    document.getElementById('gameOver').style.display = 'none';
    
    // Update UI
    updateUI();
}

function gameOver() {
    gameState.gameOver = true;
    gameState.running = false;
    
    // Update high score
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('chronoDashHighScore', gameState.highScore);
    }
    
    // Show game over screen
    document.getElementById('finalScore').textContent = `Score: ${Math.floor(gameState.score)}`;
    document.getElementById('gameOver').style.display = 'block';
}

// ========== INPUT HANDLING ==========
function handleKeyDown(e) {
    if (e.code in gameState.keys) {
        gameState.keys[e.code] = true;
        
        // Handle one-time presses
        if (e.code === 'KeyR' && !gameState.isRewinding && gameState.rewindsLeft > 0 && gameState.running) {
            const now = Date.now();
            if (now - gameState.lastRewindTime > REWIND_COOLDOWN) {
                startRewind();
                gameState.lastRewindTime = now;
            }
        }
        
        if (e.code === 'Escape' && gameState.running) {
            gameState.paused = !gameState.paused;
        }
    }
}

function handleKeyUp(e) {
    if (e.code in gameState.keys) {
        gameState.keys[e.code] = false;
        
        // Stop slow mo when Shift is released
        if (e.code === 'Shift') {
            gameState.isSlowMo = false;
        }
    }
}

function handleClick(e) {
    // Right click for slow mo
    if (e.button === 2 && gameState.running) {
        e.preventDefault();
        gameState.isSlowMo = true;
    }
}

// Prevent right-click context menu
document.addEventListener('contextmenu', e => {
    if (gameState.running) e.preventDefault();
});

// ========== GAME LOGIC ==========
function update() {
    if (!gameState.running || gameState.paused || gameState.startScreen) return;
    
    const deltaTime = gameState.isSlowMo ? SLOW_MO_FACTOR : 1;
    
    // Update player
    updatePlayer(deltaTime);
    
    // Update world
    updateWorld(deltaTime);
    
    // Update time energy
    updateTimeEnergy(deltaTime);
    
    // Update rewind
    updateRewind(deltaTime);
    
    // Update particles
    updateParticles(deltaTime);
    
    // Check collisions
    checkCollisions();
    
    // Spawn obstacles
    spawnObstacles();
    
    // Update score
    gameState.score += gameState.speed * 0.1 * deltaTime;
    
    // Increase difficulty
    gameState.speed = BASE_SPEED + (gameState.score * SPEED_INCREASE);
    
    // Update UI
    updateUI();
    
    // Frame counter
    gameState.frameCount++;
}

function updatePlayer(deltaTime) {
    const player = gameState.player;
    
    // Apply gravity
    player.velY += GRAVITY * deltaTime;
    player.y += player.velY * deltaTime;
    
    // Jumping
    if ((gameState.keys.Space || gameState.keys.ArrowUp) && !player.isJumping && player.y >= gameState.groundY - player.height) {
        player.velY = JUMP_FORCE;
        player.isJumping = true;
        // Add jump particles
        addParticles(player.x + player.width / 2, gameState.groundY, 10, '#00ffff');
    }
    
    // Land on ground
    if (player.y >= gameState.groundY - player.height) {
        player.y = gameState.groundY - player.height;
        player.velY = 0;
        player.isJumping = false;
    }
    
    // Land on platforms
    for (const platform of gameState.platforms) {
        if (player.y + player.height >= platform.y &&
            player.y + player.height <= platform.y + platform.height &&
            player.x + player.width > platform.x &&
            player.x < platform.x + platform.width &&
            player.velY > 0) {
            player.y = platform.y - player.height;
            player.velY = 0;
            player.isJumping = false;
        }
    }
    
    // Save position for rewind
    if (gameState.frameCount % 5 === 0) {
        gameState.rewindBuffer.push({
            x: player.x,
            y: player.y,
            velY: player.velY,
            isJumping: player.isJumping,
            score: gameState.score,
            speed: gameState.speed
        });
        
        // Limit buffer size
        if (gameState.rewindBuffer.length > 60 * 5) { // 5 seconds at 60fps
            gameState.rewindBuffer.shift();
        }
    }
}

function updateWorld(deltaTime) {
    // Move obstacles
    for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
        const obstacle = gameState.obstacles[i];
        obstacle.x -= gameState.speed * deltaTime;
        
        // Remove off-screen obstacles
        if (obstacle.x + obstacle.width < 0) {
            gameState.obstacles.splice(i, 1);
        }
    }
    
    // Move coins
    for (let i = gameState.coins.length - 1; i >= 0; i--) {
        const coin = gameState.coins[i];
        coin.x -= gameState.speed * deltaTime;
        
        // Remove off-screen coins
        if (coin.x + coin.width < 0) {
            gameState.coins.splice(i, 1);
        }
    }
    
    // Move platforms
    for (let i = gameState.platforms.length - 1; i >= 0; i--) {
        const platform = gameState.platforms[i];
        platform.x -= gameState.speed * deltaTime;
        
        // Remove off-screen platforms
        if (platform.x + platform.width < 0) {
            gameState.platforms.splice(i, 1);
        }
    }
}

function updateTimeEnergy(deltaTime) {
    if (gameState.isSlowMo) {
        gameState.timeEnergy -= TIME_ENERGY_DRAIN * deltaTime;
        if (gameState.timeEnergy <= 0) {
            gameState.timeEnergy = 0;
            gameState.isSlowMo = false;
        }
    } else {
        gameState.timeEnergy = Math.min(TIME_ENERGY_MAX, gameState.timeEnergy + TIME_ENERGY_REGEN * deltaTime);
    }
}

function startRewind() {
    if (gameState.isRewinding || gameState.rewindBuffer.length === 0) return;
    
    gameState.isRewinding = true;
    gameState.rewindsLeft--;
    gameState.rewindProgress = 0;
    gameState.rewindBufferIndex = gameState.rewindBuffer.length - 1;
    
    // Save current state to return to if rewind completes
    gameState.rewindReturnState = {
        x: gameState.player.x,
        y: gameState.player.y,
        velY: gameState.player.velY,
        isJumping: gameState.player.isJumping,
        score: gameState.score,
        speed: gameState.speed
    };
}

function updateRewind(deltaTime) {
    if (!gameState.isRewinding) return;
    
    gameState.rewindProgress += deltaTime / REWIND_DURATION;
    
    if (gameState.rewindProgress >= 1) {
        // Rewind complete
        gameState.isRewinding = false;
        // Restore to the start of rewind
        const startState = gameState.rewindBuffer[0];
        gameState.player.x = startState.x;
        gameState.player.y = startState.y;
        gameState.player.velY = startState.velY;
        gameState.player.isJumping = startState.isJumping;
        gameState.score = startState.score;
        gameState.speed = startState.speed;
        
        // Clear obstacles, coins, platforms that spawned during rewind
        gameState.obstacles = gameState.obstacles.filter(obs => obs.x > gameState.player.x - GAME_WIDTH);
        gameState.coins = gameState.coins.filter(coin => coin.x > gameState.player.x - GAME_WIDTH);
        gameState.platforms = gameState.platforms.filter(plat => plat.x > gameState.player.x - GAME_WIDTH);
        
        // Add particles for rewind effect
        addParticles(gameState.player.x + gameState.player.width / 2, gameState.player.y + gameState.player.height / 2, 20, '#ff00ff');
    } else {
        // Interpolate through rewind buffer
        const index = Math.floor((1 - gameState.rewindProgress) * gameState.rewindBuffer.length);
        if (index >= 0 && index < gameState.rewindBuffer.length) {
            const state = gameState.rewindBuffer[index];
            gameState.player.x = state.x;
            gameState.player.y = state.y;
            gameState.player.velY = state.velY;
            gameState.player.isJumping = state.isJumping;
            gameState.score = state.score;
            gameState.speed = state.speed;
        }
    }
}

function spawnObstacles() {
    const now = gameState.frameCount;
    
    // Spawn obstacles
    if (now - gameState.lastObstacleSpawn > OBSTACLE_SPAWN_RATE) {
        const types = ['gap', 'spike', 'wall'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        let obstacle;
        switch (type) {
            case 'gap':
                obstacle = {
                    x: GAME_WIDTH,
                    y: gameState.groundY - 20,
                    width: 40 + Math.random() * 60,
                    height: 20,
                    type: 'gap',
                    color: '#1a1a2e'
                };
                break;
            case 'spike':
                obstacle = {
                    x: GAME_WIDTH,
                    y: gameState.groundY - 30,
                    width: 30,
                    height: 30,
                    type: 'spike',
                    color: '#ff0000'
                };
                break;
            case 'wall':
                obstacle = {
                    x: GAME_WIDTH,
                    y: gameState.groundY - 80,
                    width: 20,
                    height: 80,
                    type: 'wall',
                    color: '#444'
                };
                break;
        }
        
        gameState.obstacles.push(obstacle);
        gameState.lastObstacleSpawn = now;
    }
    
    // Spawn coins
    if (now - gameState.lastCoinSpawn > COIN_SPAWN_RATE && Math.random() > 0.5) {
        const coin = {
            x: GAME_WIDTH,
            y: gameState.groundY - 50 - Math.random() * 100,
            width: 20,
            height: 20,
            type: 'coin',
            color: '#ffff00',
            collected: false
        };
        gameState.coins.push(coin);
        gameState.lastCoinSpawn = now;
    }
    
    // Spawn platforms
    if (now - gameState.lastPlatformSpawn > PLATFORM_SPAWN_RATE && Math.random() > 0.7) {
        const platform = {
            x: GAME_WIDTH,
            y: gameState.groundY - 100 - Math.random() * 150,
            width: 60 + Math.random() * 40,
            height: 15,
            type: 'platform',
            color: '#00ff00'
        };
        gameState.platforms.push(platform);
        gameState.lastPlatformSpawn = now;
    }
}

function checkCollisions() {
    const player = gameState.player;
    
    // Check obstacle collisions
    for (const obstacle of gameState.obstacles) {
        if (obstacle.type === 'gap') {
            // Fall into gap
            if (player.x + player.width > obstacle.x &&
                player.x < obstacle.x + obstacle.width &&
                player.y + player.height > obstacle.y &&
                player.y + player.height < obstacle.y + obstacle.height) {
                gameOver();
                return;
            }
        } else {
            // Hit spike or wall
            if (player.x + player.width > obstacle.x &&
                player.x < obstacle.x + obstacle.width &&
                player.y + player.height > obstacle.y &&
                player.y < obstacle.y + obstacle.height) {
                gameOver();
                return;
            }
        }
    }
    
    // Check coin collisions
    for (let i = gameState.coins.length - 1; i >= 0; i--) {
        const coin = gameState.coins[i];
        if (!coin.collected &&
            player.x + player.width > coin.x &&
            player.x < coin.x + coin.width &&
            player.y + player.height > coin.y &&
            player.y < coin.y + coin.height) {
            coin.collected = true;
            gameState.timeEnergy = Math.min(TIME_ENERGY_MAX, gameState.timeEnergy + 20);
            gameState.score += 100;
            addParticles(coin.x + coin.width / 2, coin.y + coin.height / 2, 10, '#ffff00');
            gameState.coins.splice(i, 1);
        }
    }
    
    // Check if player falls off screen
    if (player.y > GAME_HEIGHT) {
        gameOver();
    }
}

function addParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        gameState.particles.push({
            x: x,
            y: y,
            velX: (Math.random() - 0.5) * 5,
            velY: (Math.random() - 0.5) * 5 - 2,
            life: 1,
            maxLife: 1,
            size: Math.random() * 4 + 2,
            color: color
        });
    }
}

function updateParticles(deltaTime) {
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const p = gameState.particles[i];
        p.x += p.velX * deltaTime;
        p.y += p.velY * deltaTime;
        p.life -= deltaTime * 0.05;
        
        if (p.life <= 0) {
            gameState.particles.splice(i, 1);
        }
    }
}

function updateUI() {
    // Update score
    document.getElementById('score').textContent = `Score: ${Math.floor(gameState.score)}`;
    
    // Update time meter
    const timePercent = (gameState.timeEnergy / TIME_ENERGY_MAX) * 100;
    document.getElementById('timeMeterFill').style.width = `${timePercent}%`;
    
    // Update rewind counter
    document.getElementById('rewindCounter').textContent = `Rewinds: ${gameState.rewindsLeft}`;
    document.getElementById('rewindCounter').style.color = gameState.rewindsLeft > 0 ? '#ff00ff' : '#888';
}

// ========== RENDERING ==========
function render() {
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    drawBackground(ctx);
    
    // Draw ground
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, gameState.groundY, canvas.width, GROUND_HEIGHT);
    
    // Draw grid (subtle)
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, gameState.groundY);
        ctx.stroke();
    }
    
    // Draw platforms
    for (const platform of gameState.platforms) {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Platform outline
        ctx.strokeStyle = '#00aa00';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    }
    
    // Draw obstacles
    for (const obstacle of gameState.obstacles) {
        ctx.fillStyle = obstacle.color;
        
        if (obstacle.type === 'spike') {
            // Draw spike
            ctx.beginPath();
            ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
            ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
            ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
    }
    
    // Draw coins
    for (const coin of gameState.coins) {
        if (!coin.collected) {
            ctx.fillStyle = coin.color;
            ctx.beginPath();
            ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Coin shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(coin.x + coin.width / 2 - 3, coin.y + coin.height / 2 - 3, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw player
    drawPlayer(ctx);
    
    // Draw particles
    for (const p of gameState.particles) {
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw slow-mo effect
    if (gameState.isSlowMo) {
        ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw rewind effect
    if (gameState.isRewinding) {
        const alpha = 0.3 * (1 - gameState.rewindProgress);
        ctx.fillStyle = `rgba(255, 0, 255, ${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw pause overlay
    if (gameState.paused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '32px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    }
}

function drawBackground(ctx) {
    // Starfield effect
    if (gameState.frameCount % 10 === 0) {
        gameState.stars = gameState.stars || [];
        if (gameState.stars.length < 50) {
            gameState.stars.push({
                x: Math.random() * GAME_WIDTH,
                y: Math.random() * (GAME_HEIGHT - GROUND_HEIGHT),
                size: Math.random() * 2 + 1,
                speed: Math.random() * 0.5 + 0.1
            });
        }
    }
    
    if (gameState.stars) {
        ctx.fillStyle = '#ffffff';
        for (const star of gameState.stars) {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Move stars
            star.x -= star.speed * (gameState.isSlowMo ? SLOW_MO_FACTOR : 1);
            if (star.x < 0) {
                star.x = GAME_WIDTH;
                star.y = Math.random() * (GAME_HEIGHT - GROUND_HEIGHT);
            }
        }
    }
    
    // Gradient sky
    const gradient = ctx.createLinearGradient(0, 0, 0, gameState.groundY);
    gradient.addColorStop(0, '#0f0f23');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, gameState.groundY);
}

function drawPlayer(ctx) {
    const player = gameState.player;
    
    // Player body
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Player outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.width, player.height);
    
    // Player face (simple)
    ctx.fillStyle = '#1a1a2e';
    const eyeSize = 5;
    ctx.fillRect(player.x + 10, player.y + 10, eyeSize, eyeSize);
    ctx.fillRect(player.x + player.width - 10 - eyeSize, player.y + 10, eyeSize, eyeSize);
    
    // Player mouth
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + 25, 8, 0, Math.PI);
    ctx.stroke();
    
    // Time trail effect when rewinding
    if (gameState.isRewinding) {
        const trailLength = 5;
        const trailAlpha = 0.5 * (1 - gameState.rewindProgress);
        for (let i = 1; i <= trailLength; i++) {
            const alpha = trailAlpha * (1 - i / trailLength);
            ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
            ctx.fillRect(
                player.x - i * 5,
                player.y,
                player.width,
                player.height
            );
        }
    }
}

// ========== GAME LOOP ==========
function gameLoop() {
    if (gameState.startScreen) {
        // Just render start screen
        render();
    } else {
        update();
        render();
    }
    
    requestAnimationFrame(gameLoop);
}

// ========== START THE GAME ==========
document.addEventListener('DOMContentLoaded', init);
