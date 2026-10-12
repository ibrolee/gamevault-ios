import type { GameInput } from './types';
export const SAMPLE_GAMES:(GameInput&{progress:number;favorite?:number;notes?:string})[]=[
{title:'Far Cry 6',platform:'ROG Ally',genre:'Action / Adventure',status:'playing',progress:32,cover_color:'#BE4B38',favorite:1,notes:'Sample entry — replace this with your own progress.'},
{title:'EA SPORTS FC 27',platform:'ROG Ally',genre:'Sports',status:'playing',progress:15,cover_color:'#164E63'},
{title:'Cyberpunk 2077',platform:'PC',genre:'RPG / Open World',status:'backlog',progress:0,cover_color:'#B76A25',favorite:1},
{title:'Red Dead Redemption 2',platform:'PC',genre:'Action / Adventure',status:'completed',progress:100,cover_color:'#8C342F'},
{title:'Forza Horizon 5',platform:'ROG Ally',genre:'Racing',status:'backlog',progress:0,cover_color:'#3C428E'},
{title:'Hollow Knight',platform:'Nintendo Switch',genre:'Metroidvania',status:'wishlist',progress:0,cover_color:'#274766'}];
export const DISCOVER_PICKS:GameInput[]=[
{title:'God of War Ragnarök',platform:'PC',genre:'Action / Adventure',status:'wishlist',cover_color:'#274766'},
{title:'Hades II',platform:'PC',genre:'Roguelike',status:'wishlist',cover_color:'#BE4B38'},
{title:'Elden Ring',platform:'PC',genre:'Action RPG',status:'wishlist',cover_color:'#6E5434'},
{title:'Stardew Valley',platform:'Nintendo Switch',genre:'Simulation',status:'wishlist',cover_color:'#3C6C51'},
{title:'Ghost of Tsushima',platform:'PC',genre:'Action / Adventure',status:'wishlist',cover_color:'#70418A'},
{title:'Ori and the Will of the Wisps',platform:'PC',genre:'Platformer',status:'wishlist',cover_color:'#164E63'}];
