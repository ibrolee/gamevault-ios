import assert from 'node:assert/strict';
import {normalizedTitle,parseSteamFeatured,parseSteamSearch,knownSteamId,parseSteamDetail,rankPcRecommendations} from '../src/steam.ts';
assert.equal(normalizedTitle(' Far-Cry 6! '),'far cry 6');
assert.equal(knownSteamId('Far Cry 6'),2369390);
assert.equal(parseSteamSearch({items:[{id:42,name:'Demo',tiny_image:'https://example.com/demo.jpg'},{id:42,name:'Duplicate'},{id:-1,name:'Invalid'}]}).length,1);
const recommendations=parseSteamFeatured({top_sellers:{items:[{id:42,name:'Demo',windows_available:true,header_image:'https://example.com/header.jpg'},{id:40,name:'Console only',windows_available:false}]},new_releases:{items:[{id:42,name:'Duplicate'},{id:45,name:'New PC'}]}});
assert.equal(recommendations.length,2);
assert.deepEqual(recommendations.map(x=>x.title),['Demo','New PC']);
assert.equal(recommendations[0].category,'Popular on Steam');
assert.deepEqual(parseSteamFeatured(null),[]);

const details=parseSteamDetail(42,{'42':{success:true,data:{type:'game',name:'Demo',genres:[{description:'Action'},{description:'Adventure'}],header_image:'https://cdn.example.com/game.jpg',platforms:{windows:true}}}});
assert.equal(details.genre,'Action / Adventure');
assert.equal(parseSteamDetail(42,{'42':{success:true,data:{type:'dlc',platforms:{windows:true}}}}),null);
assert.equal(parseSteamDetail(42,{'42':{success:true,data:{type:'game',platforms:{windows:false}}}}),null);
const base={imageUrl:'https://example.com/a',fallbackUrl:'https://example.com/b',platform:'PC',cover_color:'#454074',status:'wishlist'};
const ranked=rankPcRecommendations([
  {...base,id:1,title:'Other Game',genre:'Strategy',category:'Popular on Steam'},
  {...base,id:2,title:'Action Game',genre:'Action / Adventure',category:'New on PC'},
  {...base,id:3,title:'Already Owned',genre:'Action',category:'On sale'}
],[{title:'Already Owned',genre:'RPG',status:'playing',favorite:1},{title:'Far Cry 6',genre:'Action / Adventure',status:'playing',favorite:1}]);
assert.deepEqual(ranked.map(x=>x.title),['Action Game','Other Game']);
console.log('PASS: Steam search, PC metadata, genre ranking, and artwork parsing');
