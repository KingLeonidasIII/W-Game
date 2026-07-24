// Chrono Dash - Endless Runner with Time Control
// Simplified and fixed version

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
const REWIND_DURATION = 2.5;
const MAX_REWINDS = 3;
const REWIND_COOLDOWN = 1000;
const OBSTACLE_SPAWN_RATE = 150;
const COIN_SPAWN_RATE = 200;
const PLATFORM_SPAWN_RATE = 300;

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
    gameOver: false,
    startScreen: true,
    player: {
        x: 100,
        y: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT,
        velY: 0,
        isJumping: false,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        color: '#00ffff'
    },
    groundY: GAME_HEIGHT - GROUND_HEIGHT,
    obstacles: [],
    coins: [],
    platforms: [],
    particles: [],
    stars: [],
    keys: {},
    frameCount: 0,
    lastObstacleSpawn: 0,
    lastCoinSpawn: 0,
    lastPlatformSpawn: 0,
    rewindBuffer: [],
    cameraOffset: 0
};

function init() {
    gameState.canvas = document.getElementById('gameCanvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    gameState.canvas.width = GAME_WIDTH;
    gameState.canvas.height = GAME_HEIGHT;
    
    window.addEventListener('keydown', (e) => {
        gameState.keys[e.code] = true;
        gameState.keys[e.key] = true;
        
        if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') {
            if (!gameState.isRewinding && gameState.rewindsLeft > 0 && gameState.running) {
                const now = Date.now();
                if (now - gameState.lastRewindTime > REWIND_COOLDOWN) {
                    startRewind();
                    gameState.lastRewindTime = now;
                }
            }
        }
        
        if (e.code === 'Escape' || e.key === 'Escape') {
            if (gameState.running) gameState.paused = !gameState.paused;
        }
    });
    
    window.addEventListener('keyup', (e) => {
        gameState.keys[e.code] = false;
        gameState.keys[e.key] = false;
        
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.key === 'Shift') {
            gameState.isSlowMo = false;
        }
    });
    
    window.addEventListener('click', (e) => {
        if (e.button === 2 && gameState.running) {
            e.preventDefault();
            gameState.isSlowMo = true;
        }
    });
    
    window.addEventListener('contextmenu', (e) => {
        if (gameState.running) e.preventDefault();
    });
    
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', resetGame);
    
    for (let i = 0; i < 50; i++) {
        gameState.stars.push({
            x: Math.random() * GAME_WIDTH,
            y: Math.random() * (GAME_HEIGHT - GROUND_HEIGHT),
            size: Math.random() * 2 + 1,
            speed: Math.random() * 0.5 + 0.1
        });
    }
    
    showStartScreen();
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
    gameState.player.x = 100;
    gameState.player.y = GAME_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT;
    gameState.player.velY = 0;
    gameState.player.isJumping = false;
    gameState.score = 0;
    gameState.speed = BASE_SPEED;
    gameState.timeEnergy = TIME_ENERGY_MAX;
    gameState.rewindsLeft = MAX_REWINDS;
    gameState.isSlowMo = false;
    gameState.isRewinding = false;
    gameState.rewindProgress = 0;
    gameState.gameOver = false;
    gameState.paused = false;
    gameState.frameCount = 0;
    gameState.lastObstacleSpawn = 0;
    gameState.lastCoinSpawn = 0;
    gameState.lastPlatformSpawn = 0;
    gameState.cameraOffset = 0;
    gameState.obstacles = [];
    gameState.coins = [];
    gameState.platforms = [];
    gameState.particles = [];
    gameState.rewindBuffer = [];
    document.getElementById('gameOver').style.display = 'none';
    updateUI();
}

function gameOver() {
    gameState.gameOver = true;
    gameState.running = false;
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('chronoDashHighScore', gameState.highScore);
    }
    document.getElementById('finalScore').textContent = `Score: ${Math.floor(gameState.score)}`;
    document.getElementById('gameOver').style.display = 'block';
}

function update() {
    if (!gameState.running || gameState.paused || gameState.startScreen) return;
    
    const deltaTime = gameState.isSlowMo ? SLOW_MO_FACTOR : 1;
    
    // Handle slow-mo from Shift keys
    if ((gameState.keys['ShiftLeft'] || gameState.keys['ShiftRight'] || gameState.keys['Shift']) && gameState.timeEnergy > 0) {
        gameState.isSlowMo = true;
    } else {
        gameState.isSlowMo = false;
    }
    
    updatePlayer(deltaTime);
    updateWorld(deltaTime);
    updateTimeEnergy(deltaTime);
    updateRewind(deltaTime);
    updateParticles(deltaTime);
    checkCollisions();
    spawnObstacles();
    
    gameState.score += gameState.speed * 0.1 * deltaTime;
    gameState.speed = BASE_SPEED + (gameState.score * SPEED_INCREASE);
    updateUI();
    gameState.frameCount++;
}

function updatePlayer(deltaTime) {
    const player = gameState.player;
    
    // Move forward
    player.x += gameState.speed * deltaTime;
    
    // Gravity
    player.velY += GRAVITY * deltaTime;
    player.y += player.velY * deltaTime;
    
    // Jump
    const isJumpPressed = gameState.keys[' '] || gameState.keys['Space'] || gameState.keys['ArrowUp'] || gameState.keys['Up'];
    const isOnGround = player.y >= gameState.groundY - player.height;
    let isOnPlatform = false;
    
    for (const platform of gameState.platforms) {
        if (player.y + player.height >= platform.y &&
            player.y + player.height <= platform.y + platform.height &&
            player.x + player.width > platform.x &&
            player.x < platform.x + platform.width) {
            isOnPlatform = true;
            break;
        }
    }
    
    if (isJumpPressed && (isOnGround || isOnPlatform) && !player.isJumping) {
        player.velY = JUMP_FORCE;
        player.isJumping = true;
        const groundLevel = isOnGround ? gameState.groundY : player.y + player.height + 5;
        addParticles(player.x + player.width / 2, groundLevel, 10, '#00ffff');
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
    
    // Save for rewind
    if (gameState.frameCount % 2 === 0) {
        gameState.rewindBuffer.push({
            x: player.x,
            y: player.y,
            velY: player.velY,
            isJumping: player.isJumping,
            score: gameState.score,
            speed: gameState.speed
        });
        if (gameState.rewindBuffer.length > 300) gameState.rewindBuffer.shift();
    }
}

function updateWorld(deltaTime) {
    for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
        gameState.obstacles[i].x -= gameState.speed * deltaTime;
        if (gameState.obstacles[i].x + gameState.obstacles[i].width < 0) {
            gameState.obstacles.splice(i, 1);
        }
    }
    for (let i = gameState.coins.length - 1; i >= 0; i--) {
        gameState.coins[i].x -= gameState.speed * deltaTime;
        if (gameState.coins[i].x + gameState.coins[i].width < 0) {
            gameState.coins.splice(i, 1);
        }
    }
    for (let i = gameState.platforms.length - 1; i >= 0; i--) {
        gameState.platforms[i].x -= gameState.speed * deltaTime;
        if (gameState.platforms[i].x + gameState.platforms[i].width < 0) {
            gameState.platforms.splice(i, 1);
        }
    }
    for (let star of gameState.stars) {
        star.x -= star.speed * (gameState.isSlowMo ? SLOW_MO_FACTOR : 1);
        if (star.x < 0) {
            star.x = GAME_WIDTH;
            star.y = Math.random() * (GAME_HEIGHT - GROUND_HEIGHT);
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
    addParticles(gameState.player.x + gameState.player.width / 2, gameState.player.y + gameState.player.height / 2, 20, '#ff00ff');
}

function updateRewind(deltaTime) {
    if (!gameState.isRewinding) return;
    gameState.rewindProgress += deltaTime / REWIND_DURATION;
    if (gameState.rewindProgress >= 1) {
        gameState.isRewinding = false;
        if (gameState.rewindBuffer.length > 0) {
            const startState = gameState.rewindBuffer[0];
            gameState.player.x = startState.x;
            gameState.player.y = startState.y;
            gameState.player.velY = startState.velY;
            gameState.player.isJumping = startState.isJumping;
            gameState.score = startState.score;
            gameState.speed = startState.speed;
        }
        const playerX = gameState.player.x;
        gameState.obstacles = gameState.obstacles.filter(obs => obs.x > playerX - GAME_WIDTH);
        gameState.coins = gameState.coins.filter(coin => coin.x > playerX - GAME_WIDTH);
        gameState.platforms = gameState.platforms.filter(plat => plat.x > playerX - GAME_WIDTH);
        addParticles(gameState.player.x + gameState.player.width / 2, gameState.player.y + gameState.player.height / 2, 20, '#ff00ff');
    } else {
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
    if (now - gameState.lastObstacleSpawn > OBSTACLE_SPAWN_RATE) {
        const types = ['gap', 'spike', 'wall'];
        const type = types[Math.floor(Math.random() * types.length)];
        let obstacle;
        switch (type) {
            case 'gap':
                obstacle = {x: GAME_WIDTH, y: gameState.groundY - 20, width: 40 + Math.random() * 60, height: 20, type: 'gap', color: '#1a1a2e'};
                break;
            case 'spike':
                obstacle = {x: GAME_WIDTH, y: gameState.groundY - 30, width: 30, height: 30, type: 'spike', color: '#ff0000'};
                break;
            case 'wall':
                obstacle = {x: GAME_WIDTH, y: gameState.groundY - 80, width: 20, height: 80, type: 'wall', color: '#444'};
                break;
        }
        gameState.obstacles.push(obstacle);
        gameState.lastObstacleSpawn = now;
    }
    if (now - gameState.lastCoinSpawn > COIN_SPAWN_RATE && Math.random() > 0.5) {
        gameState.coins.push({x: GAME_WIDTH, y: gameState.groundY - 50 - Math.random() * 100, width: 20, height: 20, type: 'coin', color: '#ffff00', collected: false});
        gameState.lastCoinSpawn = now;
    }
    if (now - gameState.lastPlatformSpawn > PLATFORM_SPAWN_RATE && Math.random() > 0.7) {
        gameState.platforms.push({x: GAME_WIDTH, y: gameState.groundY - 100 - Math.random() * 150, width: 60 + Math.random() * 40, height: 15, type: 'platform', color: '#00ff00'});
        gameState.lastPlatformSpawn = now;
    }
}

function checkCollisions() {
    const player = gameState.player;
    for (const obstacle of gameState.obstacles) {
        if (obstacle.type === 'gap') {
            if (player.x + player.width > obstacle.x && player.x < obstacle.x + obstacle.width && player.y + player.height > obstacle.y && player.y + player.height < obstacle.y + obstacle.height) {
                gameOver();
                return;
            }
        } else {
            if (player.x + player.width > obstacle.x && player.x < obstacle.x + obstacle.width && player.y + player.height > obstacle.y && player.y < obstacle.y + obstacle.height) {
                gameOver();
                return;
            }
        }
    }
    for (let i = gameState.coins.length - 1; i >= 0; i--) {
        const coin = gameState.coins[i];
        if (!coin.collected && player.x + player.width > coin.x && player.x < coin.x + coin.width && player.y + player.height > coin.y && player.y < coin.y + coin.height) {
            coin.collected = true;
            gameState.timeEnergy = Math.min(TIME_ENERGY_MAX, gameState.timeEnergy + 20);
            gameState.score += 100;
            addParticles(coin.x + coin.width / 2, coin.y + coin.height / 2, 10, '#ffff00');
            gameState.coins.splice(i, 1);
        }
    }
    if (player.y > GAME_HEIGHT) gameOver();
}

function addParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        gameState.particles.push({x, y, velX: (Math.random() - 0.5) * 5, velY: (Math.random() - 0.5) * 5 - 2, life: 1, maxLife: 1, size: Math.random() * 4 + 2, color});
    }
}

function updateParticles(deltaTime) {
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const p = gameState.particles[i];
        p.x += p.velX * deltaTime;
        p.y += p.velY * deltaTime;
        p.life -= deltaTime * 0.05;
        if (p.life <= 0) gameState.particles.splice(i, 1);
    }
}

function updateUI() {
    document.getElementById('score').textContent = `Score: ${Math.floor(gameState.score)}`;
    document.getElementById('timeMeterFill').style.width = `${(gameState.timeEnergy / TIME_ENERGY_MAX) * 100}%`;
    document.getElementById('rewindCounter').textContent = `Rewinds: ${gameState.rewindsLeft}`;
    document.getElementById('rewindCounter').style.color = gameState.rewindsLeft > 0 ? '#ff00ff' : '#888';
}

function render() {
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const gradient = ctx.createLinearGradient(0, 0, 0, gameState.groundY);
    gradient.addColorStop(0, '#0f0f23');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, gameState.groundY);
    
    ctx.fillStyle = '#ffffff';
    for (const star of gameState.stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, gameState.groundY, canvas.width, GROUND_HEIGHT);
    
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, gameState.groundY);
        ctx.stroke();
    }
    
    for (const platform of gameState.platforms) {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        ctx.strokeStyle = '#00aa00';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    }
    
    for (const obstacle of gameState.obstacles) {
        ctx.fillStyle = obstacle.color;
        if (obstacle.type === 'spike') {
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
    
    for (const coin of gameState.coins) {
        if (!coin.collected) {
            ctx.fillStyle = coin.color;
            ctx.beginPath();
            ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(coin.x + coin.width / 2 - 3, coin.y + coin.height / 2 - 3, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    const player = gameState.player;
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.width, player.height);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(player.x + 10, player.y + 10, 5, 5);
    ctx.fillRect(player.x + player.width - 15, player.y + 10, 5, 5);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + 25, 8, 0, Math.PI);
    ctx.stroke();
    
    for (const p of gameState.particles) {
        const alpha = p.life / p.maxLife;
        const rgb = p.color.startsWith('#') ? parseInt(p.color.slice(1), 16) : 0;
        const r = (rgb >> 16) & 0xFF;
        const g = (rgb >> 8) & 0xFF;
        const b = rgb & 0xFF;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    if (gameState.isSlowMo) {
        ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (gameState.isRewinding) {
        ctx.fillStyle = `rgba(255, 0, 255, ${0.3 * (1 - gameState.rewindProgress)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (gameState.paused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '32px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    }
}

function gameLoop() {
    if (gameState.startScreen) {
        render();
    } else {
        update();
        render();
    }
    requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', init);
