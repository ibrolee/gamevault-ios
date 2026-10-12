import {parseBackup,type VaultBackup} from './backup.ts';
import type {Game,GameStatus,Session} from './types';
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const str=(x:unknown,n:number):x is string=>typeof x==='string'&&x.length>0&&x.length<=n;
const int=(x:unknown,a:number,b:number)=>Number.isInteger(x)&&(x as number)>=a&&(x as number)<=b;
export function parseGameVaultImport(text:string):VaultBackup{
 if(text.length>12000000)throw Error('File exceeds the 12MB safety limit.');
 let x:unknown;try{x=JSON.parse(text)}catch{throw Error('Invalid JSON file.')}
 if(!obj(x))throw Error('Not a supported GameVault export.');
 if('format' in x)return parseBackup(text);
 if(!Array.isArray(x.games)||!Array.isArray(x.sessions)||x.games.length>20000||x.sessions.length>120000)throw Error('Invalid Safari preview export.');
 const now=new Date().toISOString(), statuses:GameStatus[]=['playing','backlog','completed','paused','dropped','wishlist'];
 const games:Game[]=x.games.map((v:unknown)=>{if(!obj(v)||!str(v.id,120)||!str(v.title,120)||!v.title.trim()||!str(v.platform,80)||!str(v.genre,80)||!statuses.includes(v.status as GameStatus)||!int(v.progress,0,100)||!int(v.rating,0,5)||typeof v.notes!=='string'||v.notes.length>100000||typeof v.favorite!=='boolean')throw Error('Invalid Safari game data.');return {id:v.id,title:v.title,platform:v.platform,genre:v.genre,status:v.status as GameStatus,progress:v.progress as number,rating:v.rating as number,notes:v.notes,cover_color:typeof v.c1==='string'&&/^#[0-9a-fA-F]{6}$/.test(v.c1)?v.c1:'#7C3AED',favorite:v.favorite?1:0,is_sample:0,created_at:now,updated_at:now}});
 const sessions:Session[]=x.sessions.map((v:unknown)=>{if(!obj(v)||!str(v.id,120)||!str(v.gameId,120)||!int(v.minutes,1,1440)||typeof v.notes!=='string'||v.notes.length>100000||!str(v.date,40)||Number.isNaN(Date.parse(v.date)))throw Error('Invalid Safari session data.');return {id:v.id,game_id:v.gameId,minutes:v.minutes as number,notes:v.notes,played_at:v.date}});
 return parseBackup(JSON.stringify({format:'gamevault-backup',version:1,exported_at:now,games,sessions}));
}
