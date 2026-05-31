///////////////////////////////////////
// 🎮 NEON GRAVITY GLITCH - GAME.JS
// PART 1: CORE ENGINE
///////////////////////////////////////

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// =========================
// INPUT SYSTEM
// =========================

const keys = {};

window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;

    if ((game.state === "gameover" || game.state === "win") && e.key.toLowerCase() === "r") {
        resetGame();
    }
});

window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

// =========================
// GAME STATE
// =========================

const game = {
    state: "playing",
    level: 1,
    score: 0,
    time: 0,

    gravityInverted: false,
    gravityTimer: 0,
    gravityInterval: 0,

    secretFound: 0
};

// =========================
// PLAYER
// =========================

const player = {
    x: 100,
    y: 100,
    w: 30,
    h: 30,

    vx: 0,
    vy: 0,

    speed: 5,
    jump: 12,

    onGround: false,
    shield: false
};

// =========================
// WORLD OBJECTS
// =========================

let platforms = [];
let spikes = [];
let enemies = [];
let boss = null;

// =========================
// UTILITIES
// =========================

function rand(a, b) {
    return Math.random() * (b - a) + a;
}

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

function rect(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

// =========================
// RESET GAME
// =========================

function resetGame() {
    game.state = "playing";
    game.level = 1;
    game.score = 0;
    game.time = 0;
    game.gravityInverted = false;
    game.secretFound = 0;

    player.x = 100;
    player.y = 100;
    player.vx = 0;
    player.vy = 0;

    generateLevel(1);
    scheduleGravity();
}

// =========================
// GRAVITY SYSTEM
// =========================

function scheduleGravity() {
    game.gravityInterval = rand(2.5, 7.5);
    game.gravityTimer = game.gravityInterval;
}

function flipGravity() {
    game.gravityInverted = !game.gravityInverted;
    player.vy *= -1;
    scheduleGravity();
}

// =========================
// LEVEL START
// =========================

resetGame();

// =========================
// MAIN LOOP
// =========================

let last = 0;

function loop(t) {
    const dt = (t - last) / 1000;
    last = t;

    if (game.state === "playing") {
        update(dt);
    }

    render();

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// =========================
// UPDATE (CORE ONLY)
// =========================

function update(dt) {

    game.time += dt;

    // =========================
    // ⚡ GRAVITY SYSTEM
    // =========================
    game.gravityTimer -= dt;
    if (game.gravityTimer <= 0) flipGravity();

    // =========================
    // 👤 PLAYER INPUT + PHYSICS
    // =========================
    player.vx = 0;

    if (keys["a"] || keys["arrowleft"]) player.vx = -player.speed;
    if (keys["d"] || keys["arrowright"]) player.vx = player.speed;

    const jump = keys["w"] || keys[" "] || keys["arrowup"];

    if (jump && player.onGround) {
        player.vy = game.gravityInverted ? player.jump : -player.jump;
        player.onGround = false;
    }

    const g = game.gravityInverted ? -0.6 : 0.6;
    player.vy += g;

    player.x += player.vx;
    player.y += player.vy;

    player.onGround = false;

    player.x = clamp(player.x, 0, canvas.width - player.w);

    // =========================
    // 🌍 WORLD + ENEMIES + BOSSES
    // =========================
    updateEnemiesAdvanced();
    updateBossAdvanced();
    handleBossDamage();

    updateEnemiesBasic();
    handleWorldCollision();
    checkLevelComplete();
    updateCombo(dt);
    updatePowerups(dt);
    checkSecretBonus();
}

function render() {
    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00ffff";
    ctx.fillRect(player.x, player.y, player.w, player.h);
}
///////////////////////////////////////
// 👾 NEON GRAVITY GLITCH - GAME.JS
// PART 2: LEVELS + WORLD
///////////////////////////////////////

// =========================
// WORLD DATA
// =========================

platforms = [];
spikes = [];
enemies = [];

// =========================
// LEVEL GENERATION
// =========================

function generateLevel(lv) {

    platforms = [];
    spikes = [];
    enemies = [];
    boss = null;

    const groundY = canvas.height - 80;
    const ceilingY = 80;

    // =========================
    // BASE FLOOR + CEILING
    // =========================

    platforms.push({
        x: 0,
        y: groundY,
        w: canvas.width,
        h: 80
    });

    platforms.push({
        x: 0,
        y: 0,
        w: canvas.width,
        h: 80
    });

    // =========================
    // PLATFORM VARIATION
    // =========================

    const platformCount = 3 + lv;

    for (let i = 0; i < platformCount; i++) {

        platforms.push({
            x: rand(100, canvas.width - 200),
            y: rand(150, canvas.height - 200),
            w: rand(120, 220),
            h: 20
        });
    }

    // =========================
    // SPIKES (TOP + BOTTOM HAZARDS)
    // =========================

    const spikeCount = 6 + lv * 2;

    for (let i = 0; i < spikeCount; i++) {

        const top = Math.random() < 0.5;

        spikes.push({
            x: rand(50, canvas.width - 50),
            y: top ? ceilingY : groundY - 20,
            w: 40,
            h: 20
        });
    }

    // =========================
    // BASE ENEMY SPAWNING
    // =========================

    const enemyCount = 2 + lv * 2;

    for (let i = 0; i < enemyCount; i++) {

        const types = ["scout", "hunter", "teleporter"];

        enemies.push({
            x: rand(150, canvas.width - 150),
            y: rand(150, canvas.height - 150),

            vx: rand(-2, 2),
            vy: rand(-2, 2),

            r: 18,

            type: types[Math.floor(Math.random() * types.length)]
        });
    }

    // =========================
    // LEVEL PROGRESSION LOGIC
    // =========================

    player.x = 100;
    player.y = 100;
}

// =========================
// LEVEL ADVANCE CHECK
// =========================

function checkLevelComplete() {

    if (player.x > canvas.width - 50) {

        game.score += 500;

        // boss level bonus marker
        if (game.level === 3 || game.level === 7 || game.level === 10) {
            game.score += 1000;
        }

        game.level++;

        if (game.level > 10) {
            game.state = "win";
        } else {
            generateLevel(game.level);
        }
    }
}

// =========================
// BASIC ENEMY UPDATE (TEMP CORE)
// =========================

function updateEnemiesBasic() {

    for (let e of enemies) {

        e.x += e.vx;
        e.y += e.vy;

        if (e.x < 0 || e.x > canvas.width) e.vx *= -1;
        if (e.y < 100 || e.y > canvas.height - 100) e.vy *= -1;
    }
}

// =========================
// COLLISIONS (WORLD)
// =========================

function handleWorldCollision() {

    for (let p of platforms) {

        if (
            player.x < p.x + p.w &&
            player.x + player.w > p.x &&
            player.y < p.y + p.h &&
            player.y + player.h > p.y
        ) {

            player.vy = 0;
            player.onGround = true;

            if (!game.gravityInverted) {
                player.y = p.y - player.h;
            } else {
                player.y = p.y + p.h;
            }
        }
    }

    for (let s of spikes) {

        if (
            player.x < s.x + s.w &&
            player.x + player.w > s.x &&
            player.y < s.y + s.h &&
            player.y + player.h > s.y
        ) {
            killPlayer();
        }
    }
}

///////////////////////////////////////
// 🤖 ADVANCED ENEMY AI + BOSSES
// PART 3
///////////////////////////////////////

// =========================
// UPGRADED ENEMY UPDATE
// =========================

function updateEnemiesAdvanced() {

    for (let e of enemies) {

        switch (e.type) {

            // 👾 SCOUT (fast bounce)
            case "scout":
                e.x += e.vx;
                e.y += e.vy;

                if (e.x < 0 || e.x > canvas.width) e.vx *= -1;
                if (e.y < 80 || e.y > canvas.height - 80) e.vy *= -1;
                break;

            // 🧠 HUNTER (tracks player harder now)
            case "hunter":
                e.x += (player.x - e.x) * 0.03;
                e.y += (player.y - e.y) * 0.03;
                break;

            // ⚡ TELEPORTER (more dangerous)
            case "teleporter":
                if (Math.random() < 0.03) {
                    e.x = rand(100, canvas.width - 100);
                    e.y = rand(100, canvas.height - 100);
                }
                break;

            // 🧱 HEAVY (slow crusher)
            case "heavy":
                e.x += e.vx * 0.6;

                if (e.x < 0 || e.x > canvas.width) e.vx *= -1;
                break;

            // 🌫 PHANTOM (wave motion)
            case "phantom":
                e.y += Math.sin(game.time * 4 + e.x) * 2.5;
                e.x += Math.cos(game.time) * 1.2;
                break;
        }
    }
}

// =========================
// 🤖 BOSSES (3 / 7 / 10)
// =========================

function spawnBoss(lv) {

    if (lv !== 3 && lv !== 7 && lv !== 10) return;

    let type = "sentinel";

    if (lv === 7) type = "quantum";
    if (lv === 10) type = "mainframe";

    boss = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        r: lv === 10 ? 80 : 60,

        maxHp:
            lv === 3 ? 10 :
            lv === 7 ? 18 :
            30,

        hp:
            lv === 3 ? 10 :
            lv === 7 ? 18 :
            30,

        type: type,

        phase: 1
    };
}

// =========================
// 🤖 BOSS AI
// =========================

function updateBossAdvanced() {

    if (!boss) return;

    const dx = player.x - boss.x;
    const dy = player.y - boss.y;

    // PHASE SYSTEM
    const hpRatio = boss.hp / boss.maxHp;

    if (hpRatio < 0.6) boss.phase = 2;
    if (hpRatio < 0.3) boss.phase = 3;

    // =========================
    // LEVEL 3 - SENTINEL
    // =========================

    if (boss.type === "sentinel") {

        boss.x += dx * 0.015;

        boss.y += Math.sin(game.time * 3) * (boss.phase === 3 ? 5 : 2);

        if (boss.phase >= 2 && Math.random() < 0.02) {
            boss.x += rand(-50, 50);
            boss.y += rand(-50, 50);
        }
    }

    // =========================
    // LEVEL 7 - QUANTUM CORE
    // =========================

    if (boss.type === "quantum") {

        boss.x += Math.sin(game.time * 2) * 4;
        boss.y += Math.cos(game.time * 2) * 4;

        if (boss.phase >= 2) {
            boss.x += (Math.random() - 0.5) * 6;
        }

        if (boss.phase === 3) {
            boss.x += Math.sin(game.time * 10) * 3;
        }
    }

    // =========================
    // LEVEL 10 - MAINFRAME
    // =========================

    if (boss.type === "mainframe") {

        boss.x += (Math.random() - 0.5) * 8;
        boss.y += (Math.random() - 0.5) * 8;

        if (boss.phase >= 2) {
            if (Math.random() < 0.05) {
                boss.x = rand(100, canvas.width - 100);
                boss.y = rand(100, canvas.height - 100);
            }
        }

        if (boss.phase === 3) {
            boss.x += Math.sin(game.time * 15) * 5;
            boss.y += Math.cos(game.time * 15) * 5;
        }
    }

    // =========================
    // PLAYER CONTACT DAMAGE
    // =========================

    const dist = Math.hypot(dx, dy);

    if (dist < boss.r) {
        killPlayer();
    }
}

// =========================
// 🤖 BOSS DAMAGE (UPGRADED)
// =========================

function handleBossDamage() {

    if (!boss) return;

    const dx = player.x - boss.x;
    const dy = player.y - boss.y;

    const dist = Math.hypot(dx, dy);

    const stomp =
        game.gravityInverted ? player.vy < 0 : player.vy > 0;

    if (dist < boss.r + 20 && stomp) {

        boss.hp--;

        // bounce player
        player.vy = game.gravityInverted ? 10 : -10;

        // score scaling
        game.score += 200 * boss.phase;

        if (boss.hp <= 0) {
            game.score += boss.maxHp * 500;
            boss = null;
        }
    }
}

///////////////////////////////////////
// 💥 NEON GRAVITY GLITCH
// PART 4: SCORING + SYSTEM POLISH
///////////////////////////////////////

// =========================
// 💥 COMBO SYSTEM (UPGRADED)
// =========================

let combo = 0;
let comboTimer = 0;

function addCombo(amount = 1) {
    combo += amount;
    comboTimer = 2.0; // reset decay timer
}

function updateCombo(dt) {
    if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) combo = 0;
    }
}

function getComboMultiplier() {
    if (combo >= 10) return 4;
    if (combo >= 6) return 3;
    if (combo >= 3) return 2;
    return 1;
}

// =========================
// 💰 SCORING SYSTEM
// =========================

const scoreData = {
    enemyKills: 0,
    bossDamage: 0,
    bossKills: 0,
    timeBonus: 0,
    secretBonus: 0,
    total: 0
};

function addScore(base) {
    const mult = getComboMultiplier();
    const final = base * mult;

    game.score += final;
    scoreData.total += final;

    addCombo(1);
}

// =========================
// 👾 ENEMY KILL SCORING
// =========================

function onEnemyKill() {
    scoreData.enemyKills++;

    addScore(100);
}

// =========================
// 🤖 BOSS SCORING
// =========================

function onBossHit(damage) {
    scoreData.bossDamage += damage;
    addScore(50);
}

function onBossKill(boss) {
    scoreData.bossKills++;

    game.score += boss.maxHp * 500;
    scoreData.total += boss.maxHp * 500;
}

// =========================
// 🧠 SECRET 7500 SYSTEM (FIXED)
// =========================
// Now NOT random — skill-based

function checkSecretBonus() {

    const perfectRun =
        scoreData.enemyKills > 0 &&
        enemies.length === 0 &&
        boss === null &&
        player.shield === false;

    const fastClear =
        game.time < (game.level * 25);

    if (perfectRun && fastClear && !scoreData.secretBonus) {

        scoreData.secretBonus = 7500;

        game.score += 7500;

        // visual hook (we'll render later)
        console.log("SECRET BONUS TRIGGERED");
    }
}

// =========================
// ⚡ POWERUPS (TIMED)
// =========================

const powerState = {
    shield: 0,
    speed: 0,
    multiplier: 0,
    gravityLock: 0
};

function updatePowerups(dt) {

    for (let k in powerState) {
        if (powerState[k] > 0) {
            powerState[k] -= dt;
            if (powerState[k] < 0) powerState[k] = 0;
        }
    }

    if (powerState.speed > 0) player.speed = 8;
    else player.speed = 5;

    if (powerState.shield <= 0) player.shield = false;
}

function applyPowerup(type) {

    if (type === "shield") {
        player.shield = true;
        powerState.shield = 8;
    }

    if (type === "speed") {
        powerState.speed = 6;
    }

    if (type === "multiplier") {
        scoreData.total += 1000;
    }

    if (type === "gravity") {
        powerState.gravityLock = 5;
        game.gravityTimer = 999;
    }
}

// =========================
// 🏆 LEVEL END SCORING
// =========================

function calculateLevelBonus() {

    const timeScore = Math.max(0, 5000 - game.time * 50);

    const bossBonus = scoreData.bossKills * 1500;

    const comboBonus = combo * 50;

    const finalBonus = timeScore + bossBonus + comboBonus;

    game.score += finalBonus;

    scoreData.timeBonus = timeScore;

    return finalBonus;
}

// =========================
// 💀 RESET ROUND DATA
// =========================

function resetLevelStats() {

    scoreData.enemyKills = 0;
    scoreData.bossDamage = 0;
    scoreData.bossKills = 0;
    scoreData.timeBonus = 0;

    combo = 0;
    comboTimer = 0;
}

// =========================
// 🧠 HOOK FUNCTIONS (IMPORTANT)
// =========================

// Replace enemy kill logic with:
// → onEnemyKill()

// Replace boss kill logic with:
// → onBossKill(boss)

// Call every frame:
// → updateCombo(dt)
// → updatePowerups(dt)
// → checkSecretBonus()

// Call on level end:
// → calculateLevelBonus()
// → resetLevelStats()

///////////////////////////////////////
// 🧠 NEON GRAVITY GLITCH
// PART 5: UI + GAME STATES + POLISH
///////////////////////////////////////

// =========================
// 🎮 GAME STATE
// =========================

game.state = game.state || "playing";

// =========================
// 💀 GAME OVER
// =========================

function gameOver() {
    game.state = "gameover";
}

// =========================
// 🏆 WIN STATE
// =========================

function winGame() {
    game.state = "win";
}

// =========================
// 🎥 SCREEN SHAKE
// =========================

let shake = 0;

function addShake(amount) {
    shake = Math.max(shake, amount);
}

// =========================
// 🎮 HUD DRAW
// =========================

function drawHUD() {

    ctx.fillStyle = "#00ffff";
    ctx.font = "16px monospace";

    ctx.fillText("LEVEL: " + game.level, 20, 30);
    ctx.fillText("SCORE: " + game.score, 20, 50);
    ctx.fillText("TIME: " + Math.floor(game.time), 20, 70);

    const gText = game.gravityInverted ? "INVERTED" : "NORMAL";
    ctx.fillText("GRAVITY: " + gText, 20, 90);

    ctx.fillText("COMBO: " + combo, 20, 110);
}

// =========================
// ⚡ DRAW WORLD
// =========================

function drawWorld() {

    // platforms
    ctx.fillStyle = "#2222ff";
    for (let p of platforms) {
        ctx.fillRect(p.x, p.y, p.w, p.h);
    }

    // spikes
    ctx.fillStyle = "#ff2bd6";
    for (let s of spikes) {
        ctx.fillRect(s.x, s.y, s.w, s.h);
    }

    // enemies
    ctx.fillStyle = "#ff7a00";
    for (let e of enemies) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
    }

    // boss
    if (boss) {
        ctx.fillStyle = "#00ff00";
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, boss.r, 0, Math.PI * 2);
        ctx.fill();
    }
}

// =========================
// 👤 DRAW PLAYER
// =========================

function drawPlayer() {

    ctx.fillStyle = "#00ffff";

    ctx.fillRect(player.x, player.y, player.w, player.h);
}

// =========================
// 💥 FULL RENDER
// =========================

function render() {

    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    // screen shake
    if (shake > 0) {
        ctx.translate(rand(-shake, shake), rand(-shake, shake));
        shake *= 0.9;
    }

    drawWorld();
    drawPlayer();
    drawHUD();

    ctx.restore();

    // =========================
    // 💀 GAME OVER SCREEN
    // =========================

    if (game.state === "gameover") {

        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ff0000";
        ctx.font = "40px monospace";
        ctx.fillText("SYSTEM CRASH", canvas.width/2 - 150, canvas.height/2);

        ctx.font = "20px monospace";
        ctx.fillText("PRESS R TO REBOOT", canvas.width/2 - 130, canvas.height/2 + 40);
    }

    // =========================
    // 🏆 WIN SCREEN
    // =========================

    if (game.state === "win") {

        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#00ff00";
        ctx.font = "40px monospace";
        ctx.fillText("MAINFRAME HACKED", canvas.width/2 - 200, canvas.height/2);

        ctx.font = "20px monospace";
        ctx.fillText("SCORE: " + game.score, canvas.width/2 - 120, canvas.height/2 + 40);
        ctx.fillText("TIME: " + Math.floor(game.time) + "s", canvas.width/2 - 120, canvas.height/2 + 70);

        ctx.fillText("PRESS R TO REBOOT", canvas.width/2 - 140, canvas.height/2 + 110);
    }
}

// =========================
// 🔁 INTEGRATION NOTE
// =========================
//
// replace old render() with this one
//
// add:
// addShake() inside damage/events if desired