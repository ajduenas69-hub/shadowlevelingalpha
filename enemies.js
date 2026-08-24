const Enemies = {
  skeletons: [],

  // Dynamic random spawning base sa world width at tinukoy na count
  createSkeletons(worldGroundY, worldWidth = 2000, count = 5) {
    this.skeletons = [];

    const minX = 400; // Distansya mula sa simula para hindi agad makatabi ang player
    const maxX = worldWidth - 200;

    for (let i = 0; i < count; i++) {
      const randomX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;

      this.skeletons.push({
        x: randomX,
        y: worldGroundY - 60,
        w: 40,
        h: 60,
        hp: 60,
        maxHp: 60,
        isHit: false, // Flag para malaman kung natamaan na ng isang beses
        speed: 70 + Math.random() * 30, // Random speed (70 hanggang 100)
        state: "buried",
        triggerDistance: 180,
        animFrame: 0,
        animTimer: 0,
        facingRight: false,
        riseFrameCount: 6,
        walkFrameCount: 8
      });
    }
  },

  updateSkeletons(dt, player, onPlayerHit, onReset) {
    const attackBox = {
      x: player.facingRight ? player.x + player.w : player.x - 50,
      y: player.y,
      w: 50,
      h: player.h
    };

    for (let i = this.skeletons.length - 1; i >= 0; i--) {
      const sk = this.skeletons[i];
      const dx = (player.x + player.w / 2) - (sk.x + sk.w / 2);
      const dist = Math.abs(dx);

      // Trigger: Aahon kapag malapit ang player
      if (sk.state === "buried" && dist < sk.triggerDistance) {
        sk.state = "rising";
        sk.animFrame = 0;
        sk.animTimer = 0;
        sk.facingRight = dx > 0;
      }

      // Movement & Direction Logic
      if (sk.state === "walking") {
        sk.facingRight = dx > 0;
        const moveDir = sk.facingRight ? 1 : -1;
        sk.x += moveDir * sk.speed * dt;
      }

      // Animation Timer
      sk.animTimer += dt;
      const animSpeed = sk.state === "rising" ? 0.12 : 0.10;

      while (sk.animTimer >= animSpeed) {
        sk.animTimer -= animSpeed;

        if (sk.state === "rising") {
          sk.animFrame++;
          if (sk.animFrame >= sk.riseFrameCount) {
            sk.state = "walking";
            sk.animFrame = 0;
          }
        } else if (sk.state === "walking") {
          sk.animFrame = (sk.animFrame + 1) % sk.walkFrameCount;
        }
      }

      // Hitbox Check: Hero Attacks Skeleton
      if (
        sk.state !== "buried" &&
        player.isAttacking &&
        !player.hasDealtDamage &&
        attackBox.x < sk.x + sk.w &&
        attackBox.x + attackBox.w > sk.x &&
        attackBox.y < sk.y + sk.h &&
        attackBox.y + attackBox.h > sk.y
      ) {
        sk.hp -= player.attackDamage;
        sk.isHit = true; // Lalabas na ang HP bar dahil na-hit na
        player.hasDealtDamage = true;

        if (sk.hp <= 0) {
          this.skeletons.splice(i, 1);
          continue;
        }
      }

      // Hitbox Check: Skeleton Touches Player
      if (
        sk.state === "walking" &&
        player.invincibleTimer <= 0 &&
        player.x < sk.x + sk.w &&
        player.x + player.w > sk.x &&
        player.y < sk.y + sk.h &&
        player.y + player.h > sk.y
      ) {
        onPlayerHit(15);

        if (player.hp <= 0) {
          onReset();
        }
      }
    }
  },

  drawSkeletons(ctx, riseImg, walkImg, cameraX, ZOOM) {
    this.skeletons.forEach((sk) => {
      if (sk.state === "buried") return;

      const currentImg = sk.state === "rising" ? riseImg : walkImg;
      if (!currentImg) return;

      const totalFrames = sk.state === "rising" ? sk.riseFrameCount : sk.walkFrameCount;
      const frameW = currentImg.width / totalFrames;
      const frameH = currentImg.height;

      const renderW = frameW * 2.2 * ZOOM;
      const renderH = frameH * 2.2 * ZOOM;

      const screenX = (sk.x + sk.w / 2 - cameraX) * ZOOM;
      const screenY = (sk.y + sk.h) * ZOOM;

      ctx.save();
      ctx.translate(screenX, screenY);

      if (sk.facingRight) ctx.scale(-1, 1);

      ctx.drawImage(
        currentImg,
        sk.animFrame * frameW, 0, frameW, frameH,
        -renderW / 2, -renderH, renderW, renderH
      );
      ctx.restore();

      // Skeleton HP Bar (Lalabas lang kapag na-hit at mas mataas sa 0 ang HP)
      if (sk.isHit && sk.hp > 0) {
        const hpBarW = 35 * ZOOM;
        const hpBarH = 4 * ZOOM;
        const hpBarX = screenX - hpBarW / 2;
        // Inilagay sa itaas ng ulo (screenY ay ang ibaba ng sprite, kaya ibabawas ang kabuuang renderH)
        const hpBarY = screenY - renderH - (10 * ZOOM);

        // Background / Border Bar
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(hpBarX - 1, hpBarY - 1, hpBarW + 2, hpBarH + 2);

        // Current HP Bar
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(hpBarX, hpBarY, (sk.hp / sk.maxHp) * hpBarW, hpBarH);
      }
    });
  }
};