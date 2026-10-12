export type GameStatus = 'playing' | 'backlog' | 'completed' | 'paused' | 'dropped' | 'wishlist';
export type Game = { id: string; title: string; platform: string; genre: string; status: GameStatus; progress: number; rating: number; notes: string; cover_color: string; favorite: number; is_sample: number; created_at: string; updated_at: string };
export type GameInput = Pick<Game, 'title'|'platform'|'genre'|'status'|'cover_color'>;
export type Session = { id: string; game_id: string; minutes: number; notes: string; played_at: string; game_title?: string; cover_color?: string };
export const STATUSES: {key:GameStatus;label:string}[]=[{key:'playing',label:'Playing'},{key:'backlog',label:'Backlog'},{key:'completed',label:'Completed'},{key:'paused',label:'Paused'},{key:'dropped',label:'Dropped'},{key:'wishlist',label:'Wishlist'}];
export const GAME_COLORS=['#7C3AED','#164E63','#BE4B38','#274766','#3C6C51','#70418A','#B76A25','#3C428E'];
export const PLATFORM_OPTIONS=['ROG Ally','PC','PlayStation','Xbox','Nintendo Switch','Android','iOS','Other'];
export function formatTime(minutes:number):string {if(minutes<60)return `${minutes}m`;const h=Math.floor(minutes/60),m=minutes%60;return m===0?`${h}h`:`${h}h ${m}m`;}
export function clampProgress(n:number):number{return Math.max(0,Math.min(100,Math.round(n)));}
export function makeId():string{return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;}
