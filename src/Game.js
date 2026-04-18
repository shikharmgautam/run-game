import * as THREE from 'three';
import { Player } from './Player.js';
import { World } from './World.js';
import { InputManager } from './InputManager.js';

export class Game {
  constructor() {
    this.initThreeJS();
    // Setup Loading Manager
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onLoad = () => {
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.innerText = 'Start Run';
            startBtn.disabled = false;
        }
    };
    
    this.textureLoader = new THREE.TextureLoader(loadingManager);
    this.inputManager = new InputManager();
    
    this.player = new Player(this.scene, this.textureLoader);
    this.world = new World(this.scene, this.textureLoader);
    
    this.clock = new THREE.Clock();
    
    this.state = 'START'; 
    this.score = 0;
    this.distance = 0;
    
    this.isTurning = false;
    this.turnRotationTarget = 0;
    
    this.uiElements = {
        startScreen: document.getElementById('start-screen'),
        gameOverScreen: document.getElementById('game-over-screen'),
        currentScore: document.getElementById('current-score'),
        finalScore: document.getElementById('final-score'),
        startBtn: document.getElementById('start-btn'),
        restartBtn: document.getElementById('restart-btn')
    };
    
    this.bindEvents();
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    this.renderer.render(this.scene, this.camera);
  }

  initThreeJS() {
    this.container = document.getElementById('game-container');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 150);
    
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    
    this.cameraRig = new THREE.Group();
    this.scene.add(this.cameraRig);
    this.cameraRig.add(this.camera);
    
    this.camera.position.set(0, 5, 8);
    this.camera.lookAt(0, 2, -10);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);
    
    window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  bindEvents() {
    this.uiElements.startBtn.addEventListener('click', () => this.start());
    this.uiElements.restartBtn.addEventListener('click', () => this.reset());
  }

  start() {
    this.state = 'PLAYING';
    this.uiElements.startScreen.classList.remove('active');
    this.clock.start();
    this.loop();
  }

  reset() {
    this.state = 'PLAYING';
    this.score = 0;
    this.distance = 0;
    this.isTurning = false;
    this.cameraRig.rotation.y = 0;
    
    this.player.reset();
    this.world.reset();
    
    this.uiElements.gameOverScreen.classList.remove('active');
    this.uiElements.currentScore.innerText = '0';
    
    this.clock.start();
    this.loop();
  }

  gameOver() {
    this.state = 'GAME_OVER';
    this.uiElements.gameOverScreen.classList.add('active');
    this.uiElements.finalScore.innerText = Math.floor(this.score);
  }
  
  handleTurn() {
    this.isTurning = true;
    
    // Determine direction based on swipe
    const dir = this.inputManager.isLeftPressed() ? 1 : -1;
    this.turnRotationTarget = (Math.PI / 2) * dir;
  }

  loop() {
    if (this.state !== 'PLAYING') return;

    requestAnimationFrame(() => this.loop());

    const delta = this.clock.getDelta();

    // Always update world and player to prevent freezing
    if (!this.isTurning) {
      this.player.update(delta, this.inputManager, this.world.speed);
    }
    
    // World keeps moving even during the camera spin
    this.world.update(delta);
    
    this.distance += this.world.speed * delta;
    this.score = this.distance / 10;
    this.uiElements.currentScore.innerText = Math.floor(this.score);
    this.world.speed += delta * 0.5;

    // Camera Turn Animation
    if (this.isTurning) {
      // Smoothly rotate camera rig
      this.cameraRig.rotation.y += (this.turnRotationTarget - this.cameraRig.rotation.y) * 15 * delta;
      
      // If close to target, snap and end turn
      if (Math.abs(this.turnRotationTarget - this.cameraRig.rotation.y) < 0.05) {
        // Snap camera back to forward-facing (0)
        this.cameraRig.rotation.y = 0;
        this.isTurning = false;
        
        // NOW transition the world to the new style and reset chunks in front of the camera
        this.world.executeTurn();
      }
    } else {
      const collision = this.world.checkCollisions(this.player, this.inputManager);
      
      if (collision.hit) {
        if (collision.type === 'TURN_SUCCESS') {
           this.handleTurn();
           // Reset swipe inputs to avoid multiple triggers
           this.inputManager.keys.left = false;
           this.inputManager.keys.right = false;
        } else {
           this.gameOver();
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
