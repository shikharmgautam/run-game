export class InputManager {
  constructor() {
    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false
    };
    
    // Swipe state
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchThreshold = 30; // Minimum distance for a swipe

    window.addEventListener('keydown', (e) => this.onKeyDown(e), false);
    window.addEventListener('keyup', (e) => this.onKeyUp(e), false);
    
    window.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    window.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    window.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
  }

  onKeyDown(event) {
    switch(event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = true;
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        this.keys.up = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.down = true;
        break;
    }
  }

  onKeyUp(event) {
    switch(event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = false;
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        this.keys.up = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.down = false;
        break;
    }
  }

  onTouchStart(event) {
    if (event.touches.length > 0) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
    }
  }

  onTouchMove(event) {
    // Prevent default to stop scrolling
    event.preventDefault();
  }

  onTouchEnd(event) {
    if (event.changedTouches.length > 0) {
      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;
      
      const deltaX = touchEndX - this.touchStartX;
      const deltaY = touchEndY - this.touchStartY;
      
      // Determine swipe direction based on largest delta
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > this.touchThreshold) {
          if (deltaX > 0) {
            this.keys.right = true;
            setTimeout(() => this.keys.right = false, 150);
          } else {
            this.keys.left = true;
            setTimeout(() => this.keys.left = false, 150);
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) > this.touchThreshold) {
          if (deltaY > 0) {
            // Swipe Down (Slide)
            this.keys.down = true;
            setTimeout(() => this.keys.down = false, 800); // Slide duration
          } else {
            // Swipe Up (Jump)
            this.keys.up = true;
            setTimeout(() => this.keys.up = false, 150);
          }
        }
      }
    }
  }

  isLeftPressed() {
    return this.keys.left;
  }

  isRightPressed() {
    return this.keys.right;
  }

  isUpPressed() {
    return this.keys.up;
  }
  
  isDownPressed() {
    return this.keys.down;
  }
}
