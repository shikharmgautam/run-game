import * as THREE from 'three';

export class Player {
  constructor(scene, textureLoader) {
    this.scene = scene;
    
    // Load animation frames
    this.textures = {
      idle: textureLoader.load('/character.png'),
      runLeft: textureLoader.load('/run_left.png'),
      runRight: textureLoader.load('/run_right.png')
    };
    
    // Material and Mesh
    this.material = new THREE.SpriteMaterial({ map: this.textures.idle, color: 0xffffff });
    this.mesh = new THREE.Sprite(this.material);
    
    // Base scale and height
    this.baseScaleY = 4;
    this.baseScaleX = 2;
    this.slideScaleY = 2;
    this.baseY = 2; // Half the height of the sprite to sit on the floor
    this.slideY = 1;
    this.baseZ = -4; // Move player ahead so it is not clipped on narrow mobile screens
    
    this.mesh.scale.set(this.baseScaleX, this.baseScaleY, 1);
    this.mesh.position.set(0, this.baseY, this.baseZ);
    this.scene.add(this.mesh);
    
    // Player position parameters
    this.laneWidth = 3;
    this.currentLane = 0; // -1 (left), 0 (center), 1 (right)
    this.targetX = 0;
    
    // Physics parameters
    this.isJumping = false;
    this.isSliding = false;
    this.yVelocity = 0;
    this.gravity = -40;
    this.jumpStrength = 18;
    
    // Animation parameters
    this.animationTimer = 0;
    this.currentFrame = 0; // 0: idle, 1: left, 2: idle, 3: right
    this.animationSpeed = 0.1; // seconds per frame
    
    // Cooldown to prevent rapid lane switching
    this.switchCooldown = 0;
  }

  update(delta, inputManager, gameSpeed) {
    // Handle Lane Switching
    if (this.switchCooldown > 0) {
      this.switchCooldown -= delta;
    } else {
      if (inputManager.isLeftPressed() && this.currentLane > -1) {
        this.currentLane--;
        this.switchCooldown = 0.2;
      } else if (inputManager.isRightPressed() && this.currentLane < 1) {
        this.currentLane++;
        this.switchCooldown = 0.2;
      }
    }
    
    this.targetX = this.currentLane * this.laneWidth;
    this.mesh.position.x += (this.targetX - this.mesh.position.x) * 15 * delta;

    // Handle Sliding
    if (inputManager.isDownPressed() && !this.isJumping) {
      this.isSliding = true;
      // Shrink hitbox and lower position
      this.mesh.scale.y = this.slideScaleY;
      this.mesh.position.y = this.slideY;
    } else {
      this.isSliding = false;
      if (!this.isJumping) {
        this.mesh.scale.y = this.baseScaleY;
        this.mesh.position.y = this.baseY;
      }
    }

    // Handle Jumping
    if (inputManager.isUpPressed() && !this.isJumping && !this.isSliding) {
      this.isJumping = true;
      this.yVelocity = this.jumpStrength;
    }

    if (this.isJumping) {
      this.yVelocity += this.gravity * delta;
      this.mesh.position.y += this.yVelocity * delta;

      // Check if landed
      if (this.mesh.position.y <= this.baseY) {
        this.mesh.position.y = this.baseY;
        this.isJumping = false;
        this.yVelocity = 0;
      }
    }
    
    // Update Animation Sprite
    this.updateAnimation(delta, gameSpeed);
  }
  
  updateAnimation(delta, gameSpeed) {
    if (this.isJumping) {
      // Use idle frame when jumping (or right leg up)
      this.material.map = this.textures.runRight;
      return;
    }
    
    if (this.isSliding) {
      this.material.map = this.textures.idle;
      return;
    }
    
    // Running animation cycle
    // Animation speed scales with game speed
    const currentAnimSpeed = this.animationSpeed * (40 / gameSpeed); 
    this.animationTimer += delta;
    
    if (this.animationTimer > currentAnimSpeed) {
      this.animationTimer = 0;
      this.currentFrame = (this.currentFrame + 1) % 4;
      
      switch(this.currentFrame) {
        case 0:
        case 2:
          this.material.map = this.textures.idle;
          break;
        case 1:
          this.material.map = this.textures.runLeft;
          break;
        case 3:
          this.material.map = this.textures.runRight;
          break;
      }
    }
  }

  reset() {
    this.currentLane = 0;
    this.targetX = 0;
    this.mesh.position.set(0, this.baseY, this.baseZ);
    this.mesh.scale.set(this.baseScaleX, this.baseScaleY, 1);
    this.isJumping = false;
    this.isSliding = false;
    this.yVelocity = 0;
    this.switchCooldown = 0;
    this.material.map = this.textures.idle;
  }
}
