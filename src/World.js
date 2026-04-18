import * as THREE from 'three';

export class World {
  constructor(scene, textureLoader) {
    this.scene = scene;
    
    // Load Textures
    this.textures = {
      masjidFloor: textureLoader.load('/floor.png'),
      masjidWall: textureLoader.load('/wall.png'),
      tajFloor: textureLoader.load('/taj_floor.png'),
      tajWall: textureLoader.load('/taj_wall.png'),
      turnWall: textureLoader.load('/turn_wall.png'),
      praying: textureLoader.load('/praying.png'),
      archway: textureLoader.load('/archway.png')
    };

    // Configure repeating textures
    ['masjidFloor', 'tajFloor'].forEach(key => {
      this.textures[key].wrapS = THREE.RepeatWrapping;
      this.textures[key].wrapT = THREE.RepeatWrapping;
      this.textures[key].repeat.set(3, 10);
    });
    
    ['masjidWall', 'tajWall'].forEach(key => {
      this.textures[key].wrapS = THREE.RepeatWrapping;
      this.textures[key].wrapT = THREE.RepeatWrapping;
      this.textures[key].repeat.set(10, 1);
    });

    this.currentStyle = 'masjid'; // 'masjid' or 'taj'
    
    this.chunks = [];
    this.obstacles = [];
    this.chunkLength = 100;
    this.speed = 40;
    this.pathWidth = 10;
    
    // Turn State
    this.chunksSinceLastTurn = 0;
    this.turnInterval = 4; // Every 4 chunks (~400m), spawn a turn
    this.approachingTurn = false;
    this.turnObstacle = null;
    
    // Materials
    this.floorMat = new THREE.MeshLambertMaterial({ map: this.textures.masjidFloor });
    this.wallMat = new THREE.MeshLambertMaterial({ map: this.textures.masjidWall });
    
    // Obstacle Geometries & Materials
    this.standardObsGeo = new THREE.BoxGeometry(2.5, 2, 1);
    this.standardObsMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    // Use a Plane for Praying people, we will incline it at 45 degrees
    this.prayingObsGeo = new THREE.PlaneGeometry(3, 4);
    this.prayingObsMat = new THREE.MeshLambertMaterial({ map: this.textures.praying, transparent: true });
    
    this.archwayObsGeo = new THREE.BoxGeometry(3, 3, 1);
    this.archwayObsMat = new THREE.MeshLambertMaterial({ map: this.textures.archway, transparent: true });
    
    this.turnWallGeo = new THREE.PlaneGeometry(this.pathWidth, 15);
    this.turnWallMat = new THREE.MeshLambertMaterial({ map: this.textures.turnWall });

    this.init();
  }

  init() {
    this.chunks.forEach(c => this.scene.remove(c));
    this.obstacles.forEach(o => this.scene.remove(o.mesh));
    if (this.turnObstacle) this.scene.remove(this.turnObstacle.mesh);
    
    this.chunks = [];
    this.obstacles = [];
    this.turnObstacle = null;
    this.speed = 40;
    this.chunksSinceLastTurn = 0;
    this.approachingTurn = false;
    
    for(let i=0; i<3; i++) {
        this.addChunk(i * -this.chunkLength);
    }
  }

  createChunkMesh(zPos) {
    const group = new THREE.Group();
    group.position.z = zPos;
    
    const floorGeo = new THREE.PlaneGeometry(this.pathWidth, this.chunkLength);
    const floor = new THREE.Mesh(floorGeo, this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    group.add(floor);
    
    const wallGeo = new THREE.PlaneGeometry(this.chunkLength, 15);
    const leftWall = new THREE.Mesh(wallGeo, this.wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.x = -this.pathWidth / 2 - 0.1;
    leftWall.position.y = 7.5;
    group.add(leftWall);
    
    const rightWall = new THREE.Mesh(wallGeo, this.wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.x = this.pathWidth / 2 + 0.1;
    rightWall.position.y = 7.5;
    group.add(rightWall);
    
    return group;
  }

  addChunk(zPos) {
    const chunk = this.createChunkMesh(zPos);
    this.scene.add(chunk);
    this.chunks.push(chunk);
    this.chunksSinceLastTurn++;
    
    // Spawn turn or normal obstacles
    if (this.chunksSinceLastTurn >= this.turnInterval && !this.approachingTurn) {
        this.spawnTurnObstacle(zPos);
    } else if (!this.approachingTurn && zPos < -20) {
        this.spawnObstacles(zPos);
    }
  }
  
  spawnTurnObstacle(zStart) {
    this.approachingTurn = true;
    
    const mesh = new THREE.Mesh(this.turnWallGeo, this.turnWallMat);
    mesh.position.set(0, 7.5, zStart - this.chunkLength/2);
    this.scene.add(mesh);
    
    this.turnObstacle = { mesh: mesh, type: 'TURN' };
  }
  
  spawnObstacles(zStart) {
    const numObstacles = Math.floor(Math.random() * 3) + 1;
    const laneWidth = 3;
    
    for (let i = 0; i < numObstacles; i++) {
        const lane = Math.floor(Math.random() * 3) - 1;
        const zOffset = Math.random() * (this.chunkLength - 10) + 5;
        const absZ = zStart - zOffset;
        
        const isTooClose = this.obstacles.some(o => o.lane === lane && Math.abs(o.mesh.position.z - absZ) < 15);
        if (isTooClose) continue;
        
        // Favor Praying (1) and Archway (2) over Standard (0)
        let typeId = Math.floor(Math.random() * 10);
        if (typeId < 2) typeId = 0; // 20% chance
        else if (typeId < 6) typeId = 1; // 40% chance
        else typeId = 2; // 40% chance
        
        let mesh;
        let yPos, yHitMin, yHitMax;
        
        if (typeId === 0) {
          // Standard block
          mesh = new THREE.Mesh(this.standardObsGeo, this.standardObsMat);
          yPos = 1;
          yHitMin = 0; yHitMax = 2;
        } else if (typeId === 1) {
          // Praying person (45 degree incline)
          mesh = new THREE.Mesh(this.prayingObsGeo, this.prayingObsMat);
          mesh.rotation.x = -Math.PI / 4; // -45 degrees incline
          yPos = 1.0; // Raised slightly so the bottom edge touches the floor
          yHitMin = 0; yHitMax = 1.5; // Requires jump
        } else if (typeId === 2) {
          // Archway
          mesh = new THREE.Mesh(this.archwayObsGeo, this.archwayObsMat);
          yPos = 3.5;
          yHitMin = 2; yHitMax = 5; // Requires slide
        }
        
        mesh.position.set(lane * laneWidth, yPos, absZ);
        this.scene.add(mesh);
        
        this.obstacles.push({ mesh, lane, typeId, yHitMin, yHitMax });
    }
  }

  update(delta) {
    const moveDist = this.speed * delta;
    
    this.chunks.forEach(chunk => {
        chunk.position.z += moveDist;
    });
    
    this.obstacles.forEach(obs => {
        obs.mesh.position.z += moveDist;
    });
    
    if (this.turnObstacle) {
      this.turnObstacle.mesh.position.z += moveDist;
    }
    
    if (this.chunks[0].position.z > this.chunkLength) {
        const removedChunk = this.chunks.shift();
        this.scene.remove(removedChunk);
        
        const lastZ = this.chunks[this.chunks.length - 1].position.z;
        this.addChunk(lastZ - this.chunkLength);
    }
    
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
        if (this.obstacles[i].mesh.position.z > 5) {
            this.scene.remove(this.obstacles[i].mesh);
            this.obstacles.splice(i, 1);
        }
    }
  }
  
  checkCollisions(player, inputManager) {
    const pX = player.mesh.position.x;
    const pY = player.mesh.position.y;
    const pZ = player.mesh.position.z; // usually 0
    
    // Explicit coordinate checks
    for (let obs of this.obstacles) {
        const oX = obs.mesh.position.x;
        const oZ = obs.mesh.position.z;
        
        // Z overlap (tighter depth check)
        if (Math.abs(oZ - pZ) < 0.8) {
            // X overlap (tighter width check, player sprite is thin)
            if (Math.abs(oX - pX) < 0.8) {
                // Y overlap based on obstacle type and player state
                const pBottom = pY - player.mesh.scale.y / 2;
                const pTop = pY + player.mesh.scale.y / 2;
                
                // Add a small 0.1 buffer to prevent phantom clipping
                if (pTop > obs.yHitMin + 0.1 && pBottom < obs.yHitMax - 0.1) {
                    return { hit: true, type: 'OBSTACLE' };
                }
            }
        }
    }
    
    // Check Turn Wall
    if (this.approachingTurn && this.turnObstacle) {
      const tZ = this.turnObstacle.mesh.position.z;
      // If we are getting very close to the turn wall (e.g. Z > -5)
      if (tZ > -8 && tZ < 2) {
         // Window of opportunity to swipe
         if (inputManager.isLeftPressed() || inputManager.isRightPressed()) {
            return { hit: true, type: 'TURN_SUCCESS' };
         }
      }
      // If we hit the wall without swiping
      if (tZ >= 0) {
         return { hit: true, type: 'OBSTACLE' };
      }
    }
    
    return { hit: false };
  }
  
  executeTurn() {
    // Swap texture styles
    this.currentStyle = this.currentStyle === 'masjid' ? 'taj' : 'masjid';
    
    if (this.currentStyle === 'masjid') {
      this.floorMat.map = this.textures.masjidFloor;
      this.wallMat.map = this.textures.masjidWall;
    } else {
      this.floorMat.map = this.textures.tajFloor;
      this.wallMat.map = this.textures.tajWall;
    }
    
    // Force material update
    this.floorMat.needsUpdate = true;
    this.wallMat.needsUpdate = true;
    
    // Reset World chunks instantly to fake running down a new hall
    this.init();
    // Maintain speed
    this.approachingTurn = false;
  }

  reset() {
    this.init();
  }
}
