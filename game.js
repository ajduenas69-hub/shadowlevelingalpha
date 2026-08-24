(() => {
  "use strict";

  // ENHANCED LIGHTING TOGGLE (Naka-sync sa Settings at LocalStorage)
  let isNightMode = localStorage.getItem("nightMode") === "true";
  const nightToggle = document.getElementById("nightModeToggle");

  if (nightToggle) {
    nightToggle.checked = isNightMode;
    nightToggle.addEventListener("change", (e) => {
      isNightMode = e.target.checked;
      localStorage.setItem("nightMode", isNightMode);
    });
  }

  // BACKGROUND MUSIC SETUP & VOLUME CONTROL
  const bgm = new Audio("assets/sounds/Three _Red_Hearts.ogg"); // Siguraduhing tama ang extension (.ogg / .mp3 / .wav)
  bgm.loop = true;

  const volumeSlider = document.getElementById("bgmVolumeSlider");
  const volumeText = document.getElementById("volumeValue");
  const savedVolume = localStorage.getItem("bgmVolume");

  let initialVolume = savedVolume !== null ? parseFloat(savedVolume) : 0.5;
  bgm.volume = initialVolume;

  if (volumeSlider && volumeText) {
    volumeSlider.value = initialVolume;
    volumeText.textContent = `${Math.round(initialVolume * 100)}%`;

    volumeSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      bgm.volume = val;
      volumeText.textContent = `${Math.round(val * 100)}%`;
      localStorage.setItem("bgmVolume", val);
    });
  }

  let isMusicStarted = false;
  function playMusic() {
    if (!isMusicStarted) {
      bgm.play().then(() => {
        isMusicStarted = true;
      }).catch(() => {});
    }
  }

  // CANVAS / FULLSCREEN
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  let W = window.innerWidth;
  let H = window.innerHeight;
  const ZOOM = 1.30;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    ctx.imageSmoothingEnabled = false;
  }
  window.addEventListener("resize", resize);
  resize();

  // ASSETS
  const assets = {};
  const assetFiles = {
    sky: "assets/environments/background_2.png",
    middle: "assets/environments/middleground_2.png",
    houses: "assets/environments/houses.png",
    ground: "assets/environments/ground.png",
    groundB: "assets/environments/ground-b.png",
    streetLamp: "assets/environments/street-lamp.png",

    heroIdle: "assets/spritesheet/hero_idle.png",
    heroRun: "assets/spritesheet/hero_run2.png",
    heroAttack: "assets/spritesheet/hero_attack.png",

    // SKELETON ASSETS
    skelRise: "assets/spritesheet/skeleton_rise.png",
    skelWalk: "assets/spritesheet/skeleton_walk.png"
  };

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load: " + src));
      img.src = src;
    });
  }

  // INPUT
  const keys = new Set();
  const jumpKeys = ["Space"];

  window.addEventListener("mousedown", (e) => {
    playMusic();
    if (e.button === 0 && !player.isAttacking) { 
      player.isAttacking = true;
      player.attackFrame = 0;
      player.attackTimer = 0;
      player.hasDealtDamage = false;
    }
  });

  window.addEventListener("keydown", (e) => {
    playMusic();
    keys.add(e.code);
    if (jumpKeys.includes(e.code)) e.preventDefault();
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.code);
  });

  function isLeft() { return keys.has("KeyA"); }
  function isRight() { return keys.has("KeyD"); }
  function isJump() {
    for (const key of jumpKeys) if (keys.has(key)) return true;
    return false;
  }

  // WORLD
  const HOUSE_COUNT = 2;
  const world = {
    width: 2000,
    groundY: 443,
    gravity: 1900,
    moveSpeed: 300,
    jumpVelocity: 690
  };

  let lampPositions = [510, 1380, 2080, 2850];

  // GLOWING FLIES / FIREFLIES
  let flies = [];

  function initFlies() {
    flies = [];
    const selectedLamps = [lampPositions[0]];
    const remainingLamps = lampPositions.slice(1).sort(() => 0.5 - Math.random());
    if (remainingLamps.length > 0) {
      selectedLamps.push(remainingLamps[0]);
    }

    selectedLamps.forEach((lampX) => {
      const lampTopY = world.groundY - 120;
      const flyCount = 4 + Math.floor(Math.random() * 3);

      for (let i = 0; i < flyCount; i++) {
        flies.push({
          homeX: lampX,
          homeY: lampTopY,
          x: lampX + (Math.random() - 0.5) * 100,
          y: lampTopY + (Math.random() - 0.5) * 60,
          vx: 0,
          vy: 0,
          baseAngle: Math.random() * Math.PI * 2,
          speed: 0.8 + Math.random() * 1.2,
          radius: 60 + Math.random() * 80,
          flicker: Math.random() * Math.PI * 2,
          wanderOffset: Math.random() * 100
        });
      }
    });
  }

  function updateFlies(dt) {
    if (!isNightMode) return;

    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;

    flies.forEach((fly, index) => {
      fly.baseAngle += fly.speed * dt;
      fly.flicker += 8 * dt;

      const wanderX = Math.sin(fly.baseAngle + fly.wanderOffset) * fly.radius;
      const wanderY = Math.cos(fly.baseAngle * 0.8) * (fly.radius * 0.5);
      
      const targetX = fly.homeX + wanderX;
      const targetY = fly.homeY + wanderY;

      flies.forEach((other, otherIdx) => {
        if (index === otherIdx) return;
        const flyDx = fly.x - other.x;
        const flyDy = fly.y - other.y;
        const flyDist = Math.hypot(flyDx, flyDy);
        const minDist = 30;

        if (flyDist < minDist && flyDist > 0) {
          const pushForce = (minDist - flyDist) / minDist;
          fly.vx += (flyDx / flyDist) * pushForce * 250 * dt;
          fly.vy += (flyDy / flyDist) * pushForce * 250 * dt;
        }
      });

      const dx = fly.x - playerCenterX;
      const dy = fly.y - playerCenterY;
      const dist = Math.hypot(dx, dy);
      const scareRadius = 130;

      if (dist < scareRadius) {
        const force = (scareRadius - dist) / scareRadius;
        const scatterAngle = Math.atan2(dy, dx) + (index % 2 === 0 ? 0.7 : -0.7);
        
        fly.vx += Math.cos(scatterAngle) * force * 900 * dt;
        fly.vy += Math.sin(scatterAngle) * force * 900 * dt;
      } else {
        fly.vx += (targetX - fly.x) * 1.8 * dt;
        fly.vy += (targetY - fly.y) * 1.8 * dt;
      }

      fly.vx *= 0.92;
      fly.vy *= 0.92;

      fly.x += fly.vx * dt;
      fly.y += fly.vy * dt;
    });
  }

  function drawFlies() {
    if (!isNightMode) return;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    flies.forEach((fly) => {
      const screenX = (fly.x - cameraX) * ZOOM;
      const screenY = fly.y * ZOOM;

      if (screenX < -20 || screenX > W + 20) return;

      const alpha = 0.6 + Math.sin(fly.flicker) * 0.3;
      const glowRadius = 10 * ZOOM;

      const grad = ctx.createRadialGradient(
        screenX, screenY, 0,
        screenX, screenY, glowRadius
      );
      grad.addColorStop(0, `rgba(255, 240, 150, ${alpha})`);
      grad.addColorStop(0.4, `rgba(255, 180, 50, ${alpha * 0.5})`);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(screenX, screenY, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha + 0.2})`;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 1.8 * ZOOM, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  // PLAYER
  const player = {
    x: 150,
    y: world.groundY - 64,
    w: 48,
    h: 64,
    vx: 0,
    vy: 0,
    grounded: false,
    coyote: 0,
    jumpLock: false,
    facingRight: true,

    hp: 100,
    maxHp: 100,
    invincibleTimer: 0,

    animFrame: 0,
    animTimer: 0,
    idleFrameCount: 4,
    runFrameCount: 6,

    isAttacking: false,
    attackFrame: 0,
    attackTimer: 0,
    attackFrameCount: 6,
    hasDealtDamage: false,
    attackDamage: 25
  };

  // CAMERA
  let cameraX = 0;
  const CAMERA_POSITION = 0.30;
  const CAMERA_SMOOTH = 6.5;

  // HOUSES
  let houseWorldWidth = 500;
  let housePositions = [];

  function createHouses() {
    houseWorldWidth = assets.houses.width * 1.5;
    const spacing = houseWorldWidth * 1.1;
    housePositions = [];

    for (let i = 0; i < HOUSE_COUNT; i++) {
      housePositions.push(180 + i * spacing);
    }

    world.width = housePositions[housePositions.length - 1] + houseWorldWidth - 350;
    player.x = Math.min(player.x, world.width - player.w);
  }

  function reset() {
    player.x = 150;
    player.y = world.groundY - player.h;
    player.vx = 0;
    player.vy = 0;
    player.hp = player.maxHp;
    player.invincibleTimer = 0;
    player.grounded = true;
    player.coyote = 0;
    player.jumpLock = false;
    player.animFrame = 0;
    player.animTimer = 0;
    player.isAttacking = false;
    player.hasDealtDamage = false;
    cameraX = 0;

    // RANDOM SPAWN: Dynamic skeleton generator (5 skeletons)
    Enemies.createSkeletons(world.groundY, world.width, 5);
    initFlies();
  }

  function updatePlayer(dt) {
    if (player.invincibleTimer > 0) {
      player.invincibleTimer -= dt;
    }

    const direction = (isRight() ? 1 : 0) - (isLeft() ? 1 : 0);
    if (direction > 0) player.facingRight = true;
    if (direction < 0) player.facingRight = false;

    if (direction !== 0) {
      const acceleration = player.grounded ? 2600 : 1700;
      player.vx += direction * acceleration * dt;
      player.vx = Math.max(-world.moveSpeed, Math.min(world.moveSpeed, player.vx));
    } else {
      const friction = player.grounded ? 2800 : 800;
      const amount = friction * dt;
      if (Math.abs(player.vx) <= amount) player.vx = 0;
      else player.vx -= Math.sign(player.vx) * amount;
    }

    if (player.isAttacking) {
      player.attackTimer += dt;
      const attackSpeed = 0.06;

      while (player.attackTimer >= attackSpeed) {
        player.attackTimer -= attackSpeed;
        player.attackFrame++;
        if (player.attackFrame >= player.attackFrameCount) {
          player.isAttacking = false;
          player.attackFrame = 0;
          player.attackTimer = 0;
          break;
        }
      }
    }

    player.animTimer += dt;
    const isRunning = Math.abs(player.vx) > 10;
    const animSpeed = isRunning ? 0.09 : 0.18;

    while (player.animTimer >= animSpeed) {
      player.animTimer -= animSpeed;
      player.animFrame++;
    }

    if (player.grounded) player.coyote = 0.11;
    else player.coyote = Math.max(0, player.coyote - dt);

    const wantsJump = isJump();
    if (wantsJump && !player.jumpLock && (player.grounded || player.coyote > 0)) {
      player.vy = -world.jumpVelocity;
      player.grounded = false;
      player.coyote = 0;
      player.jumpLock = true;
    }
    if (!wantsJump) player.jumpLock = false;
    if (!wantsJump && player.vy < -260) player.vy += 1450 * dt;

    const oldY = player.y;
    player.vy += world.gravity * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    player.x = Math.max(0, Math.min(world.width - player.w, player.x));
    player.grounded = false;

    if (player.vy >= 0) {
      if (oldY + player.h <= world.groundY && player.y + player.h >= world.groundY) {
        player.y = world.groundY - player.h;
        player.vy = 0;
        player.grounded = true;
      }
    }

    if (player.y > H / ZOOM + 400) reset();

    updateCamera(dt);
  }

  function updateCamera(dt) {
    const desiredScreenX = W * CAMERA_POSITION;
    const desiredCameraX = player.x - (desiredScreenX / ZOOM);
    const maxCamera = Math.max(0, world.width - (W / ZOOM));
    const target = Math.max(0, Math.min(maxCamera, desiredCameraX));
    const smooth = 1 - Math.exp(-CAMERA_SMOOTH * dt);

    cameraX += (target - cameraX) * smooth;
    if (Math.abs(target - cameraX) < 0.01) cameraX = target;
  }

  function drawParallax(img, factor, y, scale) {
    const width = img.width * scale * ZOOM;
    const height = img.height * scale * ZOOM;
    const offset = -(cameraX * factor * ZOOM) % width;

    for (let i = -1; i <= 1; i++) {
      const x = offset + i * width;
      if (x > W || x + width < 0) continue;
      ctx.drawImage(img, Math.floor(x), Math.floor(y * ZOOM), Math.ceil(width), Math.ceil(height));
    }
  }

  function drawBackground() {
    ctx.fillStyle = "#2b1d36";
    ctx.fillRect(0, 0, W, H);

    drawParallax(assets.sky, 0.08, -35, 2);
    drawParallax(assets.middle, 0.20, -5, 2);

    drawHouses();

    const gradient = ctx.createLinearGradient(0, H * 0.55, 0, H);
    gradient.addColorStop(0, "rgba(42,28,53,0)");
    gradient.addColorStop(1, "rgba(42,28,53,.75)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
  }

  function drawHouses() {
    const scale = ZOOM * 1.8;
    const houseW = assets.houses.width * scale;
    const houseH = assets.houses.height * scale;

    for (let i = 0; i < housePositions.length; i++) {
      const screenX = (housePositions[i] - cameraX) * ZOOM;
      if (screenX > W + houseW || screenX + houseW < -houseW) continue;
      
      const houseY = world.groundY * ZOOM - houseH + 47;
      ctx.drawImage(assets.houses, Math.floor(screenX), Math.floor(houseY), Math.ceil(houseW), Math.ceil(houseH));
    }
  }

  function drawStreetLamps() {
    const img = assets.streetLamp;
    if (!img) return;

    const scale = 2.2 * ZOOM;
    const lampW = img.width * scale;
    const lampH = img.height * scale;

    lampPositions.forEach((posX) => {
      const screenX = (posX - cameraX) * ZOOM;
      if (screenX > W + lampW || screenX + lampW < -lampW) return;

      const screenY = world.groundY * ZOOM - lampH;
      ctx.drawImage(img, Math.floor(screenX), Math.floor(screenY), Math.ceil(lampW), Math.ceil(lampH));
    });
  }

  function drawLampLights() {
    const img = assets.streetLamp;
    if (!img) return;

    const scale = 2.2 * ZOOM;
    const lampW = img.width * scale;
    const lampH = img.height * scale;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    lampPositions.forEach((posX) => {
      const screenX = (posX - cameraX) * ZOOM;
      if (screenX > W + lampW || screenX + lampW < -lampW) return;

      const lampTopY = world.groundY * ZOOM - lampH;
      const lightCenterX = screenX + lampW / 2;
      const lightCenterY = lampTopY + (lampH * 0.10);

      const time = performance.now() * 0.005;
      const flicker = Math.sin(time) * 0.05 + Math.random() * 0.03;
      
      const radius = (isNightMode ? 150 : 110 + flicker * 30) * ZOOM;

      const grad = ctx.createRadialGradient(
        lightCenterX, lightCenterY, 4 * ZOOM,
        lightCenterX, lightCenterY, radius
      );

      if (isNightMode) {
        grad.addColorStop(0, `rgba(255, 230, 150, ${0.9 + flicker})`);
        grad.addColorStop(0.25, "rgba(255, 170, 50, 0.5)");
        grad.addColorStop(0.65, "rgba(220, 100, 20, 0.18)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        grad.addColorStop(0, `rgba(255, 215, 120, ${0.75 + flicker})`);
        grad.addColorStop(0.4, "rgba(240, 160, 50, 0.25)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lightCenterX, lightCenterY, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  function drawAtmosphere() {
    if (!isNightMode) return;

    ctx.save();
    ctx.globalCompositeOperation = "color-dodge";
    
    const ambientGrad = ctx.createLinearGradient(0, 0, 0, H);
    ambientGrad.addColorStop(0, "rgba(30, 15, 45, 0.1)");
    ambientGrad.addColorStop(0.7, "rgba(180, 100, 40, 0.12)");
    ambientGrad.addColorStop(1, "rgba(40, 20, 50, 0.05)");

    ctx.fillStyle = ambientGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawGround() {
    const sourceTileW = 16, sourceTileH = 48, sourceScale = 3;
    const tileWorldW = sourceTileW * sourceScale;
    const tileScreenW = tileWorldW * ZOOM;
    const tileScreenH = sourceTileH * sourceScale * ZOOM;
    const transparentTop = 9 * sourceScale;
    const groundScreenY = (world.groundY - transparentTop) * ZOOM;

    const firstTile = Math.floor(cameraX / tileWorldW) - 2;
    const tileCount = Math.ceil(W / tileScreenW) + 5;

    for (let i = 0; i < tileCount; i++) {
      const tileIndex = firstTile + i;
      const screenX = (tileIndex * tileWorldW - cameraX) * ZOOM;
      if (screenX > W + tileScreenW || screenX + tileScreenW < -tileScreenW) continue;

      const tile = Math.abs(tileIndex) % 5 === 0 ? assets.groundB : assets.ground;
      ctx.drawImage(tile, Math.floor(screenX), Math.floor(groundScreenY), Math.ceil(tileScreenW), Math.ceil(tileScreenH));
    }
  }

  function drawPlayer() {
    if (player.invincibleTimer > 0 && Math.floor(performance.now() / 80) % 2 === 0) {
      return;
    }

    let spriteImg;
    let sourceX = 0;
    let frameW = 0;
    let frameH = 0;
    let offsetY = 0;

    if (player.isAttacking) {
      spriteImg = assets.heroAttack;
      frameW = spriteImg.width / player.attackFrameCount;
      frameH = spriteImg.height;
      sourceX = player.attackFrame * frameW;

      offsetY = 17 * ZOOM;
    } else {
      const isRunning = Math.abs(player.vx) > 10;
      spriteImg = isRunning ? assets.heroRun : assets.heroIdle;
      const totalFrames = isRunning ? player.runFrameCount : player.idleFrameCount;
      const currentFrame = Math.floor(player.animFrame) % totalFrames;

      frameW = spriteImg.width / totalFrames;
      frameH = spriteImg.height;
      sourceX = currentFrame * frameW;
    }

    if (!spriteImg) return;

    const renderW = frameW * 2.2 * ZOOM;
    const renderH = frameH * 2.2 * ZOOM;

    const playerCenterX = (player.x + player.w / 2 - cameraX) * ZOOM;
    const playerBottomY = (player.y + player.h) * ZOOM;

    ctx.save();
    ctx.translate(playerCenterX, playerBottomY + offsetY);

    if (!player.facingRight) ctx.scale(-1, 1);

    ctx.drawImage(
      spriteImg,
      sourceX, 0, frameW, frameH,
      -renderW / 2, -renderH, renderW, renderH
    );

    ctx.restore();
  }

  function drawUI() {
    const barX = 20;
    const barY = 20;
    const barW = 200;
    const barH = 20;

    ctx.fillStyle = "#1a1026";
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

    const hpWidth = (player.hp / player.maxHp) * barW;
    ctx.fillStyle = player.hp > 30 ? "#43b25e" : "#d93838";
    ctx.fillRect(barX, barY, hpWidth, barH);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`HP: ${player.hp} / ${player.maxHp}`, barX + 10, barY + 14);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawStreetLamps();
    drawGround();

    // RENDER SKELETONS
    Enemies.drawSkeletons(ctx, assets.skelRise, assets.skelWalk, cameraX, ZOOM);

    drawPlayer();
    drawLampLights();
    drawAtmosphere();
    drawFlies();
    drawUI();
  }

  async function boot() {
    try {
      const entries = Object.entries(assetFiles);
      const loaded = await Promise.all(
        entries.map(async ([key, src]) => [key, await loadImage(src)])
      );

      for (const [key, img] of loaded) assets[key] = img;

      createHouses(); // Kinukuha muna ang world width
      reset();        // Ginagamit ang natukoy na world width para sa skeleton spawn

      let last = performance.now();

      function gameLoop(now) {
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;

        updatePlayer(dt);

        // UPDATE SKELETONS
        Enemies.updateSkeletons(
          dt, 
          player, 
          (damage) => {
            player.hp = Math.max(0, player.hp - damage);
            player.invincibleTimer = 1.0;
            player.vy = -300;
            player.vx = player.facingRight ? -250 : 250;
          }, 
          reset
        );

        updateFlies(dt);
        render();

        requestAnimationFrame(gameLoop);
      }

      requestAnimationFrame(gameLoop);
    } catch (error) {
      console.error(error);
      ctx.fillStyle = "#120d19";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px monospace";
      ctx.fillText("Failed to load game assets.", 30, 40);
      ctx.fillText(error.message, 30, 70);
    }
  }

  boot();
})();
// ==========================================
// MOBILE TOUCH EVENT LISTENERS
// ==========================================

const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnJump = document.getElementById('btnJump');
const btnAttack = document.getElementById('btnAttack');

// Tiyaking umiiral ang keys object para sa movement control ng laro mo
if (typeof keys === 'undefined') {
  var keys = { left: false, right: false, up: false, attack: false };
}

// LEFT BUTTON
if (btnLeft) {
  btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); keys.left = true; });
  btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); keys.left = false; });
}

// RIGHT BUTTON
if (btnRight) {
  btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); keys.right = true; });
  btnRight.addEventListener('touchend', (e) => { e.preventDefault(); keys.right = false; });
}

// JUMP BUTTON
if (btnJump) {
  btnJump.addEventListener('touchstart', (e) => { 
    e.preventDefault(); 
    keys.up = true;
    if (typeof jump === 'function') jump(); // Tawagin ang jump function mo kung mayroon
  });
  btnJump.addEventListener('touchend', (e) => { e.preventDefault(); keys.up = false; });
}

// ATTACK BUTTON
if (btnAttack) {
  btnAttack.addEventListener('touchstart', (e) => { 
    e.preventDefault(); 
    keys.attack = true;
    if (typeof attack === 'function') attack(); // Tawagin ang attack function mo kung mayroon
  });
  btnAttack.addEventListener('touchend', (e) => { e.preventDefault(); keys.attack = false; });
}
