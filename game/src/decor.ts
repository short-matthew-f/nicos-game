// Decorating Nico's house: the colours he can pick for the walls and the rug (the things he can buy
// and place are unlocks: unlocks.ts, room 'home'). Data only.
export const WALLPAPERS: Record<string, { label: string; wall: string; stripe: string; trim: string }> = {
  blue: { label: '💙 Sky blue', wall: '#C9DDF2', stripe: '#FFFFFF', trim: '#8FA9C4' },
  mint: { label: '💚 Mint', wall: '#CDEBD8', stripe: '#FFFFFF', trim: '#7FB596' },
  sunny: { label: '💛 Sunny yellow', wall: '#F7E3A6', stripe: '#FFF6D6', trim: '#D9B75A' },
  peach: { label: '🧡 Peach', wall: '#F7D2BE', stripe: '#FFFFFF', trim: '#D99A7A' },
  space: { label: '🚀 Space', wall: '#2E3A66', stripe: '#3E4C80', trim: '#1E2748' },
  red: { label: '❤️ Team red', wall: '#E8A09A', stripe: '#F4C6C1', trim: '#B8554D' },
};
export const RUGS: Record<string, { label: string; rings: [string, string, string] }> = {
  sunny: { label: '🎯 Red and yellow', rings: ['#E5484D', '#F2C14E', '#E5484D'] },
  ocean: { label: '🌊 Ocean', rings: ['#2F7FD8', '#7FD1E8', '#2F7FD8'] },
  forest: { label: '🌲 Forest', rings: ['#3E8F5A', '#A6CF7E', '#3E8F5A'] },
  candy: { label: '🍭 Candy', rings: ['#F06A8A', '#FFFFFF', '#7B5BA6'] },
};
export const REDECORATE = 5;   // $ to change the walls or the rug
