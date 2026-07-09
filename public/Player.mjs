class Player {
  constructor({ x, y, score, id }) {
    this.x = x;
    this.y = y;
    this.score = score;
    this.id = id;
    this.width = 30;
    this.height = 30;
  }

  movePlayer(dir, speed) {
    switch (dir) {
      case 'up':
        this.y -= speed;
        break;
      case 'down':
        this.y += speed;
        break;
      case 'left':
        this.x -= speed;
        break;
      case 'right':
        this.x += speed;
        break;
      default:
        break;
    }
  }

  collision(item) {
    const itemSize = item.width || 15;
    if (
      this.x < item.x + itemSize &&
      this.x + this.width > item.x &&
      this.y < item.y + itemSize &&
      this.y + this.height > item.y
    ) {
      return true;
    }
    return false;
  }

  calculateRank(arr) {
    const sorted = arr.slice().sort((a, b) => b.score - a.score);
    const currentRanking = sorted.findIndex((p) => p.id === this.id) + 1;
    return `Rank: ${currentRanking}/${arr.length}`;
  }
}

export default Player;
