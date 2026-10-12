import type {SQLiteDatabase} from 'expo-sqlite';
import type {Game,GameInput,Session} from './types';
import {SAMPLE_GAMES} from './sample';
import {clampProgress,makeId} from './types';
import {createBackup,type VaultBackup} from './backup';
export async function initializeDatabase(db:SQLiteDatabase):Promise<void>{
 await db.execAsync(`PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS gamevault_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS games(id TEXT PRIMARY KEY NOT NULL,title TEXT NOT NULL,platform TEXT NOT NULL DEFAULT 'PC',genre TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'backlog',progress INTEGER NOT NULL DEFAULT 0,rating INTEGER NOT NULL DEFAULT 0,notes TEXT NOT NULL DEFAULT '',cover_color TEXT NOT NULL DEFAULT '#7C3AED',cover_url TEXT NOT NULL DEFAULT '',favorite INTEGER NOT NULL DEFAULT 0,is_sample INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY NOT NULL,game_id TEXT NOT NULL,minutes INTEGER NOT NULL,notes TEXT NOT NULL DEFAULT '',played_at TEXT NOT NULL,FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE);
 CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
 CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(played_at DESC);`);
 const columns=await db.getAllAsync<{name:string}>('PRAGMA table_info(games)');
 if(!columns.some(c=>c.name==='cover_url'))await db.execAsync("ALTER TABLE games ADD COLUMN cover_url TEXT NOT NULL DEFAULT '';");
 const initialized=await db.getFirstAsync<{value:string}>("SELECT value FROM gamevault_meta WHERE key='initialized'");
 if(!initialized){await db.withTransactionAsync(async()=>{const now=new Date().toISOString();for(const item of SAMPLE_GAMES){await db.runAsync('INSERT INTO games(id,title,platform,genre,status,progress,rating,notes,cover_color,cover_url,favorite,is_sample,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',makeId(),item.title,item.platform,item.genre,item.status,item.progress,0,item.notes??'',item.cover_color,item.cover_url??'',item.favorite??0,1,now,now)}await db.runAsync("INSERT INTO gamevault_meta(key,value) VALUES('initialized','1')");await db.runAsync("INSERT INTO gamevault_meta(key,value) VALUES('samples_present','1')")});}
}
export async function fetchGames(db:SQLiteDatabase):Promise<Game[]>{return db.getAllAsync<Game>('SELECT * FROM games ORDER BY updated_at DESC,title ASC');}
export async function fetchSessions(db:SQLiteDatabase):Promise<Session[]>{return db.getAllAsync<Session>('SELECT s.*,g.title AS game_title,g.cover_color AS cover_color FROM sessions s JOIN games g ON g.id=s.game_id ORDER BY s.played_at DESC,s.id DESC');}
export async function insertGame(db:SQLiteDatabase,input:GameInput):Promise<string>{const id=makeId(),now=new Date().toISOString();await db.runAsync('INSERT INTO games(id,title,platform,genre,status,progress,rating,notes,cover_color,cover_url,favorite,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',id,input.title.trim(),input.platform,input.genre.trim(),input.status,input.status==='completed'?100:0,0,'',input.cover_color,input.cover_url??'',0,now,now);return id;}
export async function saveGame(db:SQLiteDatabase,id:string,patch:Partial<Game>):Promise<void>{
 const existing=await db.getFirstAsync<Game>('SELECT * FROM games WHERE id=?',id);if(!existing)throw Error('Game not found.');
 const x={...existing,...patch};await db.runAsync('UPDATE games SET title=?,platform=?,genre=?,status=?,progress=?,rating=?,notes=?,cover_color=?,cover_url=?,favorite=?,is_sample=0,updated_at=? WHERE id=?',x.title.trim(),x.platform,x.genre,x.status,clampProgress(x.progress),Math.max(0,Math.min(5,x.rating)),x.notes,x.cover_color,x.cover_url??'',x.favorite?1:0,new Date().toISOString(),id);
}
export async function removeGame(db:SQLiteDatabase,id:string):Promise<void>{await db.runAsync('DELETE FROM games WHERE id=?',id);}
export async function addSession(db:SQLiteDatabase,gameId:string,minutes:number,notes:string):Promise<void>{if(!Number.isInteger(minutes)||minutes<1||minutes>1440)throw Error('Session must be between 1 and 1440 minutes.');if(!(await db.getFirstAsync('SELECT id FROM games WHERE id=?',gameId)))throw Error('Game not found.');const now=new Date().toISOString();await db.withTransactionAsync(async()=>{await db.runAsync('INSERT INTO sessions(id,game_id,minutes,notes,played_at) VALUES(?,?,?,?,?)',makeId(),gameId,minutes,notes.trim(),now);await db.runAsync('UPDATE games SET updated_at=? WHERE id=?',now,gameId)})}
export async function removeSamples(db:SQLiteDatabase):Promise<void>{if(!(await areSamplesPresent(db)))return;await db.withTransactionAsync(async()=>{await db.runAsync('DELETE FROM games WHERE is_sample=1 AND created_at=updated_at AND NOT EXISTS(SELECT 1 FROM sessions WHERE sessions.game_id=games.id)');await db.runAsync("DELETE FROM gamevault_meta WHERE key='samples_present'")})}
export async function areSamplesPresent(db:SQLiteDatabase):Promise<boolean>{return !!(await db.getFirstAsync("SELECT value FROM gamevault_meta WHERE key='samples_present'"));}
export async function exportDatabase(db:SQLiteDatabase):Promise<VaultBackup>{return createBackup(await fetchGames(db),await fetchSessions(db));}
export async function restoreDatabase(db:SQLiteDatabase,data:VaultBackup):Promise<void>{
 await db.withExclusiveTransactionAsync(async txn=>{await txn.runAsync('DELETE FROM sessions');await txn.runAsync('DELETE FROM games');for(const g of data.games)await txn.runAsync('INSERT INTO games(id,title,platform,genre,status,progress,rating,notes,cover_color,cover_url,favorite,is_sample,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',g.id,g.title,g.platform,g.genre,g.status,g.progress,g.rating,g.notes,g.cover_color,g.cover_url??'',g.favorite,g.is_sample,g.created_at,g.updated_at);
 for(const s of data.sessions)await txn.runAsync('INSERT INTO sessions(id,game_id,minutes,notes,played_at) VALUES(?,?,?,?,?)',s.id,s.game_id,s.minutes,s.notes,s.played_at);
 await txn.runAsync("INSERT OR REPLACE INTO gamevault_meta(key,value) VALUES('initialized','1')");await txn.runAsync("DELETE FROM gamevault_meta WHERE key='samples_present'");if(data.games.some(g=>g.is_sample))await txn.runAsync("INSERT INTO gamevault_meta(key,value) VALUES('samples_present','1')")});
}
