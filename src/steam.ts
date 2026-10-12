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
export const fetchFeaturedPc=()=>remembered('featured',1000*60*30,async()=>parseSteamFeatured(await requestJson(ORIGIN+'/featuredcategories/?cc=us&l=english')));
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
