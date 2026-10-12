import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import {useSQLiteContext} from 'expo-sqlite';
import type {Game,GameInput,Session} from './types';
import {addSession,areSamplesPresent,fetchGames,fetchSessions,insertGame,removeGame,removeSamples,saveGame,exportDatabase,restoreDatabase} from './db';
import type {VaultBackup} from './backup';
type Store={games:Game[];sessions:Session[];loading:boolean;samplesPresent:boolean;error:string|null;reload:()=>Promise<void>;create:(input:GameInput)=>Promise<string>;update:(id:string,patch:Partial<Game>)=>Promise<void>;remove:(id:string)=>Promise<void>;log:(id:string,minutes:number,notes:string)=>Promise<void>;clearSamples:()=>Promise<void>;backup:()=>Promise<VaultBackup>;restore:(data:VaultBackup)=>Promise<void>};
const Context=createContext<Store|undefined>(undefined);
export function StoreProvider({children}:{children:React.ReactNode}){
 const db=useSQLiteContext();const [games,setGames]=useState<Game[]>([]),[sessions,setSessions]=useState<Session[]>([]),[loading,setLoading]=useState(true),[samplesPresent,setSamplesPresent]=useState(false),[error,setError]=useState<string|null>(null);
 const reload=useCallback(async()=>{try{const [g,s,f]=await Promise.all([fetchGames(db),fetchSessions(db),areSamplesPresent(db)]);setGames(g);setSessions(s);setSamplesPresent(f);setError(null);}catch(e){setError(e instanceof Error?e.message:String(e));throw e;}finally{setLoading(false)}},[db]);
 useEffect(()=>{void reload().catch(()=>undefined)},[reload]);
 const create=useCallback(async(input:GameInput)=>{const id=await insertGame(db,input);await reload();return id},[db,reload]);
 const update=useCallback(async(id:string,patch:Partial<Game>)=>{await saveGame(db,id,patch);await reload()},[db,reload]);
 const remove=useCallback(async(id:string)=>{await removeGame(db,id);await reload()},[db,reload]);
 const log=useCallback(async(id:string,minutes:number,notes:string)=>{await addSession(db,id,minutes,notes);await reload()},[db,reload]);
 const clearSamples=useCallback(async()=>{await removeSamples(db);await reload()},[db,reload]);
 const backup=useCallback(()=>exportDatabase(db),[db]);
 const restore=useCallback(async(data:VaultBackup)=>{await restoreDatabase(db,data);await reload()},[db,reload]);
 const value=useMemo(()=>({games,sessions,loading,samplesPresent,error,reload,create,update,remove,log,clearSamples,backup,restore}),[games,sessions,loading,samplesPresent,error,reload,create,update,remove,log,clearSamples,backup,restore]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStore():Store{const ctx=useContext(Context);if(!ctx)throw Error('useStore must be used inside StoreProvider');return ctx;}
