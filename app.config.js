// Generates brand artwork without an external asset pipeline.
// Expo evaluates this file before validating icon and splash paths.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = __dirname;
const assets = path.join(root, 'assets');
const table = new Uint32Array(256);
for(let n=0;n<256;n++){let c=n;for(let j=0;j<8;j++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;table[n]=c>>>0;}
function crc32(b){let c=0xFFFFFFFF;for(const x of b)c=table[(c^x)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function chunk(type,data){const t=Buffer.from(type,'ascii');const body=Buffer.concat([t,data]);const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(body));return Buffer.concat([len,body,crc]);}
function roundRect(x,y,l,t,r,b,rad){if(x<l||x>r||y<t||y>b)return false;const cx=Math.max(l+rad,Math.min(r-rad,x));const cy=Math.max(t+rad,Math.min(b-rad,y));const dx=x-cx,dy=y-cy;return dx*dx+dy*dy<=rad*rad;}
function makeIcon(size){const raw=Buffer.alloc((size*3+1)*size);const k=size/1024;
 for(let y=0;y<size;y++){const yy=y/k;let offset=y*(size*3+1);raw[offset]=0;
 for(let x=0;x<size;x++){const xx=x/k;let rgb=[11,13,24];
 if(roundRect(xx,yy,125,125,899,899,213))rgb=[156,123,250];
 if(roundRect(xx,yy,267,373,757,652,136))rgb=[26,20,48];
 const pad=(xx>345&&xx<445&&yy>465&&yy<518)||(xx>380&&xx<410&&yy>420&&yy<565);
 const circ=(cx,cy,r)=>(xx-cx)**2+(yy-cy)**2<r*r;
 if(pad||circ(635,494,31)||circ(711,432,31))rgb=[245,237,255];
 if(circ(712,550,16))rgb=[100,224,185];
 let o=offset+1+x*3;raw[o]=rgb[0];raw[o+1]=rgb[1];raw[o+2]=rgb[2];}
 }
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
function ensureArtwork(){fs.mkdirSync(assets,{recursive:true});
 for(const [name,size] of [['icon.png',1024],['splash.png',1284]]){const file=path.join(assets,name);if(!fs.existsSync(file))fs.writeFileSync(file,makeIcon(size));}}
module.exports=({config})=>{ensureArtwork();return {...config,icon:'./assets/icon.png',splash:{image:'./assets/splash.png',resizeMode:'contain',backgroundColor:'#080B14'}};};
