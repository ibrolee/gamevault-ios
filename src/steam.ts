// Public Steam storefront endpoints are unofficial and may change without notice.
// This service requires internet for discovery but never stores account credentials.
export type SteamListing = {
  id:number; title:string; imageUrl:string; fallbackUrl:string; genre:string;
  platform:'PC'; cover_color:string; status:'wishlist'; category:string;
};
type SearchItem={id?:number;name?:string;tiny_image?:string;type?:string};
type FeaturedItem={id?:number;name?:string;header_image?:string;windows_available?:boolean};
const ORIGIN='https://store.steampowered.com/api';
const cache=new Map<string,{expires:number;value:Promise<SteamListing[]>}>();
const detailCache=new Map<number,Promise<SteamDetail|null>>();
export type SteamDetail={id:number;genre:string;headerImage:string;windows:boolean};
const portrait=(id:number)=>`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${id}/library_600x900.jpg`;
const header=(id:number)=>`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${id}/header.jpg`;
const safeHttps=(v:unknown)=>typeof v==='string'&&v.startsWith('https://')?v:'';
const validId=(id:unknown):id is number=>Number.isInteger(id)&&Number(id)>0;
export const normalizedTitle=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
export const getPortraitForId=(id:number)=>portrait(id);
export const knownSteamId=(name:string):number|undefined=>({
  'far cry 6':2369390,'cyberpunk 2077':1091500,'red dead redemption 2':1174180,
  'forza horizon 5':1551360,'hollow knight':367520,'elden ring':1245620,
  'stardew valley':413150,'hades ii':1145350,'god of war ragnar k':2322010,
  'ghost of tsushima directors cut':2215430,'ori and the will of the wisps':1057090
} as Record<string,number>)[normalizedTitle(name)];
export function parseSteamSearch(payload:unknown):SteamListing[]{
  if(!payload||typeof payload!=='object')return [];
  const items=(payload as {items?:SearchItem[]}).items;
  if(!Array.isArray(items))return [];
  const ids=new Set<number>();
  return items.filter(x=>x&&validId(x.id)&&typeof x.name==='string'&&x.name.trim().length>0)
    .filter(x=>{if(ids.has(x.id!))return false;ids.add(x.id!);return true;})
    .slice(0,25).map(x=>({id:x.id!,title:x.name!.trim(),imageUrl:portrait(x.id!),fallbackUrl:safeHttps(x.tiny_image)||header(x.id!),genre:'PC game',platform:'PC' as const,cover_color:'#454074',status:'wishlist' as const,category:'Search result'}));
}
export function parseSteamFeatured(payload:unknown):SteamListing[]{
  if(!payload||typeof payload!=='object')return [];
  const x=payload as Record<string,{items?:FeaturedItem[]}>;
  const groups:[string,string][]=[['top_sellers','Popular on Steam'],['new_releases','New on PC'],['specials','On sale']];
  const ids=new Set<number>();
  return groups.flatMap(([key,label])=>Array.isArray(x[key]?.items)?x[key].items!.map(item=>({item,label})):[])
    .filter(({item})=>!!item&&validId(item.id)&&typeof item.name==='string'&&item.name.trim()!==''&&item.windows_available!==false)
    .filter(({item})=>{if(ids.has(item.id!))return false;ids.add(item.id!);return true;})
    .slice(0,35)
    .map(({item,label})=>({id:item.id!,title:item.name!.trim(),imageUrl:portrait(item.id!),fallbackUrl:safeHttps(item.header_image)||header(item.id!),genre:'PC game',platform:'PC' as const,cover_color:'#3D5175',status:'wishlist' as const,category:label}));
}
async function requestJson(url:string):Promise<unknown>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  try{
    const res=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
    if(!res.ok)throw Error('Steam is unavailable ('+res.status+').');
    return await res.json();
  }finally{clearTimeout(timeout);}
}
function remembered(key:string,ttl:number,load:()=>Promise<SteamListing[]>):Promise<SteamListing[]>{
  const now=Date.now(),entry=cache.get(key);
  if(entry&&entry.expires>now)return entry.value;
  const promise=load().catch(e=>{cache.delete(key);throw e;});
  cache.set(key,{expires:now+ttl,value:promise});
  return promise;
}
export const fetchFeaturedPc=(force=false)=>{if(force)cache.delete('featured');return remembered('featured',1000*60*30,async()=>parseSteamFeatured(await requestJson(ORIGIN+'/featuredcategories/?cc=us&l=english')));};
export const searchSteamGames=(query:string)=>{
  const term=query.trim();
  if(term.length<2)return Promise.resolve([] as SteamListing[]);
  return remembered('search:'+term.toLowerCase(),1000*60*15,async()=>parseSteamSearch(await requestJson(ORIGIN+'/storesearch/?term='+encodeURIComponent(term)+'&l=english&cc=us')));
};
export async function findSteamCover(title:string):Promise<{imageUrl:string;fallbackUrl:string}|null>{
  const known=knownSteamId(title);
  if(known)return {imageUrl:portrait(known),fallbackUrl:header(known)};
  if(title.trim().length<2)return null;
  const results=await searchSteamGames(title);
  const match=results.find(g=>normalizedTitle(g.title)===normalizedTitle(title));
  return match?{imageUrl:match.imageUrl,fallbackUrl:match.fallbackUrl}:null;
}

/** Metadata enrichment for a small, bounded selection of current PC games.
 * All requests use public storefront data. Failures never block Discover.
 */
export function parseSteamDetail(id:number,payload:unknown):SteamDetail|null{
  if(!validId(id)||!payload||typeof payload!=='object')return null;
  const item=(payload as Record<string,unknown>)[String(id)];
  if(!item||typeof item!=='object')return null;
  const result=item as {success?:boolean;data?:{type?:string;name?:string;genres?:{description?:string}[];header_image?:string;platforms?:{windows?:boolean}}};
  if(!result.success||!result.data||result.data.type!=='game'||result.data.platforms?.windows===false)return null;
  const genres=Array.isArray(result.data.genres)?result.data.genres.map(g=>g?.description).filter((g):g is string=>typeof g==='string'&&g.length>0).slice(0,3):[];
  return {id,genre:genres.join(' / ')||'PC game',headerImage:safeHttps(result.data.header_image),windows:true};
}
export function getSteamDetail(id:number):Promise<SteamDetail|null>{
  if(!validId(id))return Promise.resolve(null);
  const cached=detailCache.get(id);if(cached)return cached;
  const promise=requestJson(ORIGIN+'/appdetails/?appids='+id+'&cc=us&l=english')
    .then(data=>parseSteamDetail(id,data)).catch(()=>null);
  detailCache.set(id,promise);
  return promise;
}
export async function enrichPcRecommendations(items:SteamListing[]):Promise<SteamListing[]>{
  const select=new Set<number>();
  for(const group of ['Popular on Steam','New on PC','On sale']){
    items.filter(i=>i.category===group).slice(0,4).forEach(i=>select.add(i.id));
  }
  const chosen=items.filter(i=>select.has(i.id));
  const extras=new Map<number,SteamDetail|null>();
  // Limit concurrency to reduce rate limiting; detail failures leave original items intact.
  for(let i=0;i<chosen.length;i+=3){
    const batch=chosen.slice(i,i+3);
    const resolved=await Promise.all(batch.map(x=>getSteamDetail(x.id)));
    batch.forEach((x,j)=>extras.set(x.id,resolved[j]));
  }
  return items.map(item=>{
    const data=extras.get(item.id);
    return data?{...item,genre:data.genre,fallbackUrl:data.headerImage||item.fallbackUrl}:item;
  });
}
type Taste={title:string;genre:string;status:string;favorite:number};
const tokens=(s:string)=>s.toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>2&&!['game','games','indie','open','world','playing','completed'].includes(x));
export function rankPcRecommendations(items:SteamListing[],library:Taste[]):SteamListing[]{
  const collected=new Set(library.map(g=>normalizedTitle(g.title)));
  const tastes=new Map<string,number>();
  for(const g of library){
    if(g.status==='dropped')continue;
    const weight=g.favorite?4:(g.status==='playing'||g.status==='completed'?3:1);
    for(const word of new Set(tokens(g.genre)))tastes.set(word,(tastes.get(word)||0)+weight);
  }
  return items.filter(g=>!collected.has(normalizedTitle(g.title)))
    .map((item,index)=>{
      const genreScore=[...new Set(tokens(item.genre))].reduce((n,w)=>n+(tastes.get(w)||0),0);
      const freshness=item.category==='New on PC'?2:item.category==='Popular on Steam'?1:0;
      return {item,index,score:genreScore*3+freshness};
    })
    .sort((a,b)=>b.score-a.score||a.index-b.index)
    .map(x=>x.item);
}
