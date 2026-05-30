export const SCORPIO_SHOOTER_ID = 'speedrun-shooter';
export const SCORPIO_SOCCER_ID = 'scorpio-soccer';

export const SCORPIO_ORIGINAL_IDS = [SCORPIO_SHOOTER_ID, SCORPIO_SOCCER_ID];

export const GAMES = [
  {
    id: SCORPIO_SHOOTER_ID,
    slug: 'project_scorpio__aim_lab',
    name: 'Project Scorpio: Aim Lab',
    price: 0,
    playable: true,
    isScorpioOriginal: true,
    image:
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop',
    genre: 'Action',
    tags: ['FPS', 'Aim Trainer', 'Free'],
    description:
      'Standalone aim trainer — balloon targets in a cafe arena, CS-style movement, tracers, and Free Practice with no timer.',
  },
  {
    id: SCORPIO_SOCCER_ID,
    slug: 'project_scorpio__soccer',
    name: 'Project Scorpio: Soccer Stadium',
    price: 10,
    playable: true,
    isScorpioOriginal: true,
    image:
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=450&fit=crop',
    genre: 'Sports',
    tags: ['Sports', 'Soccer', '3D'],
    description:
      'Standalone 7v7 stadium match — offside, set pieces, Xbox controller support, and real-time day/night lighting.',
  },
  { name: 'Cyberpunk 2077', price: 60, image: '/cyberpunk.jpg', genre: 'RPG', tags: ['RPG', 'Open World'] },
  { name: 'The Witcher 3', price: 40, image: '/witcher.jpg', genre: 'RPG', tags: ['RPG', 'Story-Rich'] },
  { name: 'Elden Ring', price: 55, image: '/elden.jpg', genre: 'Action', tags: ['Action', 'Souls-like'] },
  { name: 'Ghost of Tsushima', price: 50, image: '/ghost.jpg', genre: 'Action', tags: ['Action', 'Open World'] },
  { name: 'Hollow Knight', price: 15, image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&h=225&fit=crop', genre: 'Indie', tags: ['Indie', 'Platformer'] },
  { name: 'Hades', price: 25, image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=225&fit=crop', genre: 'Roguelike', tags: ['Roguelike', 'Action'] },
  { name: 'Red Dead Redemption 2', price: 45, image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=225&fit=crop', genre: 'Action', tags: ['Open World', 'Story-Rich'] },
  { name: 'Disco Elysium', price: 30, image: 'https://images.unsplash.com/photo-1493711662062-fa541f87e26e?w=400&h=225&fit=crop', genre: 'RPG', tags: ['RPG', 'Detective'] },
];

export function gameByName(name) {
  return GAMES.find((g) => g.name === name);
}

export function gameById(id) {
  return GAMES.find((g) => g.id === id);
}

export function isPlayable(game) {
  return Boolean(game?.playable && game?.id);
}

export function isScorpioOriginal(game) {
  return Boolean(game?.isScorpioOriginal);
}

export function scorpioOriginals() {
  return GAMES.filter(isScorpioOriginal);
}
