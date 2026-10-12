import React, {useEffect,useState} from 'react';
import { Image, Pressable, Text, View, type DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, styles, statusColor } from './styles';
import type { Game } from './types';
import {findSteamCover} from './steam';
export function Icon({name,size=20,color=C.white}:{name:React.ComponentProps<typeof Ionicons>['name'];size?:number;color?:string}){return <Ionicons name={name} size={size} color={color}/>;}
export function Logo({compact=false}:{compact?:boolean}){return <View style={{flexDirection:'row',alignItems:'center',gap:9}}><LinearGradient colors={['#BEA2FF','#6241C9']} style={{height:compact?31:40,width:compact?31:40,borderRadius:12,alignItems:'center',justifyContent:'center'}}><Icon name="game-controller" color="#fff" size={compact?19:24}/></LinearGradient><Text style={{color:C.white,fontSize:compact?17:20,fontWeight:'900',letterSpacing:1}}>GAME<Text style={{color:C.purple}}>VAULT</Text></Text></View>;}
export function GameCover({game,height=160,width=122,large=false}:{game:Pick<Game,'title'|'genre'|'cover_color'> & {cover_url?:string};height?:number;width?:DimensionValue;large?:boolean}){
  const initials=game.title.split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const [found,setFound]=useState<{imageUrl:string;fallbackUrl:string}|null>(null);
  const [failed,setFailed]=useState<string[]>([]);
  useEffect(()=>{
    let active=true;
    setFound(null);setFailed([]);
    if(!game.cover_url)void findSteamCover(game.title).then(a=>{if(active)setFound(a)}).catch(()=>{});
    return ()=>{active=false};
  },[game.title,game.cover_url]);
  const primary=game.cover_url||found?.imageUrl||'';
  const fallback=found?.fallbackUrl||(primary.includes('library_600x900.jpg')?primary.replace('library_600x900.jpg','header.jpg'):'');
  const activeImage=primary&&!failed.includes(primary)?primary:fallback&&!failed.includes(fallback)?fallback:'';
  return <View style={{height,width,position:'relative',overflow:'hidden',borderRadius:large?24:15,borderWidth:1,borderColor:'rgba(255,255,255,.12)',backgroundColor:game.cover_color}}>
    <LinearGradient colors={[game.cover_color,'#0D1428']} start={{x:0,y:0}} end={{x:1,y:1}} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
    {activeImage ? <Image source={{uri:activeImage}} resizeMode="cover" onError={()=>setFailed(old=>old.includes(activeImage)?old:[...old,activeImage])} style={{position:'absolute',top:0,bottom:0,left:0,right:0,width:'100%',height:'100%'}}/> : null}
    {activeImage ? <LinearGradient colors={['transparent','#060914A8']} style={{position:'absolute',bottom:0,left:0,right:0,height:large?110:48}}/> : <View style={{position:'absolute',top:large?38:35,right:-32,width:large?178:110,height:large?178:110,borderRadius:120,borderWidth:large?24:14,borderColor:'rgba(255,255,255,.09)'}}/>}
    <View style={{flex:1,justifyContent:'flex-end',padding:large?20:9}}>
      {!activeImage&&<Text style={{color:'rgba(255,255,255,.25)',fontSize:large?73:38,fontWeight:'900',letterSpacing:-4}}>{initials}</Text>}
      <Text numberOfLines={large?3:2} style={{color:'#fff',fontWeight:'900',fontSize:large?21:10,lineHeight:large?25:13,textShadowColor:'#0009',textShadowRadius:5}}>{game.title}</Text>
      {!activeImage&&<Text numberOfLines={1} style={{color:'rgba(255,255,255,.68)',fontSize:large?12:9,marginTop:5}}>{game.genre.toUpperCase()}</Text>}
    </View>
  </View>;
}
export function ProgressBar({progress,color=C.purple,height=5}:{progress:number;color?:string;height?:number}){return <View style={{backgroundColor:'#2B3249',height,borderRadius:10,overflow:'hidden'}}><View style={{width:`${progress}%`,height:'100%',backgroundColor:color,borderRadius:10}}/></View>;}
export function StatusBadge({status}:{status:Game['status']}){const color=statusColor(status);return <View style={{backgroundColor:`${color}19`,borderColor:`${color}65`,borderWidth:1,paddingHorizontal:9,paddingVertical:5,borderRadius:99,alignSelf:'flex-start'}}><Text style={{color,fontSize:10,fontWeight:'800',textTransform:'capitalize'}}>{status}</Text></View>;}
export function StatTile({icon,label,value,accent=C.purple}:{icon:React.ComponentProps<typeof Ionicons>['name'];label:string;value:string;accent?:string}){return <View style={[styles.card,{flex:1,gap:10,padding:14,minWidth:100}]}><Icon name={icon} size={18} color={accent}/><Text style={{color:C.white,fontSize:25,fontWeight:'900'}}>{value}</Text><Text style={{color:C.muted,fontSize:11}}>{label}</Text></View>;}
export function Chip({text,active,onPress}:{text:string;active:boolean;onPress:()=>void}){return <Pressable onPress={onPress} style={{paddingVertical:9,paddingHorizontal:15,borderRadius:99,backgroundColor:active?C.purple:C.surface,borderWidth:1,borderColor:active?C.purple:C.stroke,marginRight:8}}><Text style={{color:active?'#100C1B':C.muted,fontSize:12,fontWeight:'800'}}>{text}</Text></Pressable>;}
export function SectionTitle({title,action,onAction}:{title:string;action?:string;onAction?:()=>void}){return <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:15}}><Text style={styles.sectionHeading}>{title}</Text>{action&&<Pressable onPress={onAction} accessibilityRole="button"><Text style={{color:C.purple,fontSize:12,fontWeight:'800'}}>{action} ›</Text></Pressable>}</View>;}
