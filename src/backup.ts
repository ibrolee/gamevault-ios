import type {Game,GameStatus,Session} from './types';
export type VaultBackup={format:'gamevault-backup';version:1;exported_at:string;games:Game[];sessions:Session[]};
const statuses:readonly GameStatus[]=['playing','backlog','completed','paused','dropped','wishlist'];
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const str=(x:unknown,n=5000):x is string=>typeof x==='string'&&x.length<=n;
const dt=(x:unknown)=>str(x,40)&&!Number.isNaN(Date.parse(x));
const int=(x:unknown,a:number,b:number)=>Number.isInteger(x)&&(x as number)>=a&&(x as number)<=b;
export function parseBackup(text:string):VaultBackup{
 if(text.length>12000000)throw Error('Backup exceeds 12MB.');
 let x:unknown;try{x=JSON.parse(text)}catch{throw Error('Invalid JSON backup.')}
 if(!obj(x)||x.format!=='gamevault-backup'||x.version!==1||!Array.isArray(x.games)||!Array.isArray(x.sessions)||!dt(x.exported_at))throw Error('Unsupported GameVault backup.');
 if(x.games.length>20000||x.sessions.length>120000)throw Error('Too many entries.');
 const ids=new Set<string>();
 for(const g of x.games){if(!obj(g)||!str(g.id,120)||!g.id||ids.has(g.id)||!str(g.title,120)||!g.title.trim()||!str(g.platform,80)||!str(g.genre,80)||!statuses.includes(g.status as GameStatus)||!int(g.progress,0,100)||!int(g.rating,0,5)||!str(g.notes,100000)||!str(g.cover_color,30)||!/^#[0-9a-fA-F]{6}$/.test(g.cover_color as string)||(g.cover_url!==undefined&&(!str(g.cover_url,2048)||(g.cover_url!==''&&!/^https:\/\/[^\s]+$/.test(g.cover_url as string))))||![0,1].includes(g.favorite as number)||![0,1].includes(g.is_sample as number)||!dt(g.created_at)||!dt(g.updated_at))throw Error('Backup has invalid game entries.');ids.add(g.id)}
 const seen=new Set<string>();
 for(const s of x.sessions){if(!obj(s)||!str(s.id,120)||!s.id||seen.has(s.id)||!str(s.game_id,120)||!ids.has(s.game_id)||!int(s.minutes,1,1440)||!str(s.notes,100000)||!dt(s.played_at))throw Error('Backup has invalid or orphaned sessions.');seen.add(s.id)}
 return {format:'gamevault-backup',version:1,exported_at:x.exported_at as string,games:x.games.map((g:Game)=>({id:g.id,title:g.title,platform:g.platform,genre:g.genre,status:g.status,progress:g.progress,rating:g.rating,notes:g.notes,cover_color:g.cover_color,cover_url:g.cover_url??'',favorite:g.favorite,is_sample:g.is_sample,created_at:g.created_at,updated_at:g.updated_at})),sessions:x.sessions.map((s:Session)=>({id:s.id,game_id:s.game_id,minutes:s.minutes,notes:s.notes,played_at:s.played_at}))}
}
export function createBackup(games:Game[],sessions:Session[]):VaultBackup{return {format:'gamevault-backup',version:1,exported_at:new Date().toISOString(),games,sessions:sessions.map(({id,game_id,minutes,notes,played_at})=>({id,game_id,minutes,notes,played_at}))};}
