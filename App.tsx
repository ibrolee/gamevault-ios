import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, Logo, GameCover, ProgressBar, StatusBadge, StatTile } from './src/components';
import { C, styles, statusColor } from './src/styles';
import { DISCOVER_PICKS } from './src/sample';
import {fetchFeaturedPc,searchSteamGames,normalizedTitle} from './src/steam';
import type {SteamListing} from './src/steam';
import { initializeDatabase } from './src/db';
import { pickBackup, shareBackup } from './src/backupIO';
import { StoreProvider, useStore } from './src/store';
import { formatTime, GAME_COLORS, PLATFORM_OPTIONS, STATUSES, clampProgress } from './src/types';
import type { Game, GameInput, GameStatus } from './src/types';

type Tab = 'home' | 'library' | 'discover' | 'activity' | 'profile';
const TABS: {id: Tab; label: string; icon: React.ComponentProps<typeof Icon>['name']; active: React.ComponentProps<typeof Icon>['name']}[] = [
  {id:'home', label:'Home', icon:'home-outline', active:'home'},
  {id:'library', label:'Library', icon:'albums-outline', active:'albums'},
  {id:'discover', label:'Discover', icon:'compass-outline', active:'compass'},
  {id:'activity', label:'Activity', icon:'pulse-outline', active:'pulse'},
  {id:'profile', label:'Profile', icon:'person-outline', active:'person'}
];

function Txt({children, color=C.white, size=14, weight='normal', style}: {children:React.ReactNode; color?: string; size?:number; weight?: 'normal'|'medium'|'bold'|'900'; style?:any}) {
  return <Text style={[{color,fontSize:size,fontWeight:weight === 'medium' ? '500' : weight}, style]}>{children}</Text>;
}
function Btn({title, onPress, secondary=false, danger=false, icon, disabled=false}: {title:string;onPress:()=>void;secondary?:boolean;danger?:boolean;icon?:React.ComponentProps<typeof Icon>['name'];disabled?:boolean}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[secondary?styles.secondaryButton:styles.primaryButton,{opacity:disabled?.5:1},danger?{backgroundColor:C.red}:null]}>
    {icon && <Icon name={icon} size={18} color={secondary?C.white:'#170D35'}/>}
    <Txt color={secondary?C.white:'#170D35'} weight="900">{title}</Txt>
  </Pressable>;
}
function Chip({label, active=false, onPress, tint=C.purple}: {label:string;active?:boolean;onPress:()=>void;tint?:string}) {
  return <Pressable onPress={onPress} style={{borderRadius:99,paddingHorizontal:14,paddingVertical:9,backgroundColor:active?tint:C.surface2,borderColor:active?tint:C.stroke,borderWidth:1,marginRight:7,marginBottom:7}}>
    <Txt color={active?'#100D23':C.muted} size={12} weight="bold">{label}</Txt>
  </Pressable>;
}
function Spacer({h=16}:{h?:number}) { return <View style={{height:h}}/>; }
function Header({subtitle,title,right}: {subtitle:string;title:string;right?:React.ReactNode}) {
  return <View style={{paddingTop:12,paddingBottom:22,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
    <View style={{flex:1}}><Txt color={C.purple} size={10} weight="900" style={{letterSpacing:2.1,marginBottom:5}}>{subtitle.toUpperCase()}</Txt><Txt size={30} weight="900">{title}</Txt></View>{right}
  </View>;
}
function Section({title,right}: {title:string;right?:React.ReactNode}) {return <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:15}}><Txt weight="900" size={18}>{title}</Txt>{right}</View>;}
function IconButton({name,onPress}:{name:React.ComponentProps<typeof Icon>['name'];onPress:()=>void}) {return <Pressable accessibilityRole="button" onPress={onPress} style={{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:C.surface2,borderWidth:1,borderColor:C.stroke}}><Icon name={name} color={C.white}/></Pressable>;}
function Empty({title,description,icon='file-tray-outline'}:{title:string;description:string;icon?:React.ComponentProps<typeof Icon>['name']}) {
  return <View style={{padding:34,borderRadius:22,backgroundColor:C.surface,borderWidth:1,borderColor:C.stroke,alignItems:'center',gap:12}}><Icon name={icon} size={35} color={C.purple}/><Txt weight="900" size={17}>{title}</Txt><Txt color={C.muted} style={{textAlign:'center',lineHeight:21}}>{description}</Txt></View>;
}
function GameLine({game,onPress}:{game:Game;onPress:()=>void}) {
  return <Pressable onPress={onPress} style={{flexDirection:'row',gap:13,marginBottom:13,alignItems:'center',backgroundColor:C.surface,borderRadius:19,padding:11,borderColor:C.stroke,borderWidth:1}}>
    <GameCover game={game} height={98} width={79}/><View style={{flex:1,gap:7}}>
      <Txt weight="900" size={15} style={{lineHeight:20}}>{game.title}</Txt>
      <Txt color={C.muted} size={12}>{game.platform}  ·  {game.genre}</Txt>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}><StatusBadge status={game.status}/><View style={{flex:1}}><ProgressBar progress={game.progress}/></View><Txt color={C.muted} size={11}>{game.progress}%</Txt></View>
    </View><Icon name="chevron-forward" size={18} color={C.dim}/>
  </Pressable>;
}
function Home({open,go,add}: {open:(g:Game)=>void;go:(tab:Tab)=>void;add:()=>void}) {
  const {games,sessions,samplesPresent}=useStore();
  const playing=games.filter(g=>g.status==='playing');
  const completed=games.filter(g=>g.status==='completed');
  const minutes=sessions.reduce((n,s)=>n+s.minutes,0);
  const recent=playing[0]||games[0];
  return <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
    <View style={{paddingTop:16,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Logo/><IconButton name="add" onPress={add}/></View>
    <Spacer h={33}/><Txt color={C.muted} size={14}>YOUR PERSONAL GAMING HQ</Txt><Spacer h={4}/><Txt size={30} weight="900">Your next adventure <Text style={{color:C.purple}}>awaits.</Text></Txt>
    {samplesPresent && <Pressable onPress={()=>go('profile')} style={{padding:12,backgroundColor:'#2E2444',borderRadius:13,marginTop:18,flexDirection:'row',alignItems:'center',gap:9}}><Icon name="information-circle-outline" color={C.purple}/><Txt color="#DCD2FF" size={12} style={{flex:1}}>Showing example games. Remove them anytime in Profile.</Txt><Icon name="chevron-forward" size={15}/></Pressable>}
    <Spacer h={25}/><View style={{flexDirection:'row',gap:9}}><StatTile icon="game-controller-outline" label="Total Games" value={String(games.length)}/><StatTile icon="checkmark-circle-outline" label="Completed" value={String(completed.length)} accent={C.green}/><StatTile icon="time-outline" label="Logged" value={formatTime(minutes)} accent={C.blue}/></View>
    <Spacer h={28}/><Section title="Continue playing" right={<Pressable onPress={()=>go('library')}><Txt color={C.purple} size={12} weight="bold">See library →</Txt></Pressable>}/>
    {recent ? <Pressable onPress={()=>open(recent)} style={{borderRadius:25,overflow:'hidden',borderWidth:1,borderColor:C.stroke}}>
      <LinearGradient colors={[recent.cover_color,'#1A1B37','#0F1422']} style={{padding:23,minHeight:204,justifyContent:'space-between'}}>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}><Txt color="#F2EFFF" size={10} weight="900" style={{letterSpacing:2}}>FEATURED GAME</Txt><StatusBadge status={recent.status}/></View>
        <View style={{flexDirection:'row',alignItems:'flex-end',gap:13}}><View style={{flex:1}}><Txt size={23} weight="900">{recent.title}</Txt><Txt color="#CDD0DF" size={12} style={{marginTop:6}}>{recent.platform}  ·  {recent.genre}</Txt><Spacer h={15}/><ProgressBar progress={recent.progress} color={C.green} height={7}/><Spacer h={8}/><Txt size={11} color="#DCDFF0">{recent.progress}% completion</Txt></View><GameCover game={recent} width={92} height={126}/></View>
      </LinearGradient>
    </Pressable>: <Empty title="Your adventure starts here" description="Add your first game to create your collection."/>}
    <Spacer h={27}/><Section title="Currently playing"/>
    {playing.length ? playing.slice(0,4).map(g=><GameLine key={g.id} game={g} onPress={()=>open(g)}/>) : <Empty title="No active games" description="Mark a game as Playing to track its progress."/>}
    <Spacer h={9}/><Btn title="Add a game" onPress={add} icon="add-circle-outline"/><Spacer h={25}/>
  </ScrollView>;
}
function Library({open,add}: {open:(g:Game)=>void;add:()=>void}) {
  const {games}=useStore(); const [term,setTerm]=useState('');const [filter,setFilter]=useState<GameStatus|'all'>('all');
  const shown=games.filter(g=>(filter==='all'||g.status===filter)&&(g.title.toLowerCase().includes(term.trim().toLowerCase())||g.genre.toLowerCase().includes(term.trim().toLowerCase())||g.platform.toLowerCase().includes(term.trim().toLowerCase())));
  return <View style={styles.screen}><View style={{paddingHorizontal:22}}><Header subtitle="Every game matters" title="My library" right={<IconButton name="add" onPress={add}/>}/>
    <TextInput value={term} onChangeText={setTerm} placeholder="Search games, genres, platforms" placeholderTextColor={C.dim} style={styles.textInput}/><Spacer h={16}/></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:22,paddingRight:14}} style={{flexGrow:0,marginBottom:18}}>
      <Chip label={`All (${games.length})`} active={filter==='all'} onPress={()=>setFilter('all')}/>{STATUSES.map(s=><Chip key={s.key} label={s.label} active={filter===s.key} onPress={()=>setFilter(s.key)}/>) }
    </ScrollView>
    <FlatList data={shown} keyExtractor={g=>g.id} renderItem={({item})=><GameLine game={item} onPress={()=>open(item)}/>} contentContainerStyle={{paddingHorizontal:22,paddingBottom:40}} ListEmptyComponent={<Empty title="Nothing here yet" description="Add a game or adjust the filters to find what you're looking for."/>}/>
  </View>;
}
function Discover({open,create}: {open:(g:Game)=>void;create:(input:GameInput)=>Promise<void>}) {
  const {games}=useStore();
  const [adding,setAdding]=useState<string|null>(null);
  const [featured,setFeatured]=useState<SteamListing[]>([]);
  const [results,setResults]=useState<SteamListing[]>([]);
  const [query,setQuery]=useState('');
  const [loading,setLoading]=useState(true);
  const [searching,setSearching]=useState(false);
  const [onlineError,setOnlineError]=useState('');
  const [searchError,setSearchError]=useState('');
  useEffect(()=>{
    let active=true;
    void fetchFeaturedPc().then(items=>{if(active){setFeatured(items);setOnlineError(items.length?'':'No PC games were returned by Steam.');}})
      .catch(()=>{if(active)setOnlineError('Steam recommendations are temporarily unavailable. Your library and offline suggestions still work.');})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[]);
  useEffect(()=>{
    let active=true;
    if(query.trim().length<2){setResults([]);setSearching(false);setSearchError('');return()=>{active=false;};}
    setSearching(true);
    const timer=setTimeout(()=>{
      void searchSteamGames(query).then(items=>{if(active){setResults(items);setSearchError('');}})
        .catch(()=>{if(active){setResults([]);setSearchError('Could not search Steam. Check your internet connection.');}})
        .finally(()=>{if(active)setSearching(false);});
    },450);
    return ()=>{active=false;clearTimeout(timer);};
  },[query]);
  const add=async(input:GameInput)=>{if(adding)return;setAdding(input.title);try{await create(input);}catch(e){Alert.alert('Unable to add',String(e));}finally{setAdding(null);}};
  const lookup=games.map(g=>normalizedTitle(g.title));
  const resultMode=query.trim().length>=2;
  const items=resultMode?results:featured;
  const top=items.filter(g=>!lookup.includes(normalizedTitle(g.title)));
  const renderListing=(p:SteamListing)=>{
    const already=games.find(g=>normalizedTitle(g.title)===normalizedTitle(p.title));
    return <View key={p.id} style={{...styles.card,flexDirection:'row',gap:14,alignItems:'center',marginBottom:12}}>
      <GameCover game={{title:p.title,genre:p.genre,cover_color:p.cover_color,cover_url:p.imageUrl}} width={79} height={103}/>
      <View style={{flex:1,gap:7}}><Txt weight="900" size={15}>{p.title}</Txt><Txt color={C.muted} size={12}>{p.category}</Txt><Txt color={C.dim} size={11}>PC · Steam listing</Txt>
        <Pressable onPress={()=>already?open(already):void add({title:p.title,genre:p.genre,platform:'PC',status:'wishlist',cover_color:p.cover_color,cover_url:p.imageUrl})} disabled={adding===p.title}
          style={{backgroundColor:already?C.surface2:C.purple,borderRadius:10,paddingVertical:9,paddingHorizontal:10,alignSelf:'flex-start'}}>
          <Txt size={12} weight="bold" color={already?C.white:'#160E29'}>{already?'View in library':adding===p.title?'Adding…':'+ Add to wishlist'}</Txt>
        </Pressable>
      </View>
    </View>;
  };
  return <ScrollView style={styles.screen} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
    <Header subtitle="Explore the world of PC gaming" title="Discover"/>
    <View style={{...styles.card,backgroundColor:'#1B2039',marginBottom:21}}>
      <Icon name="sparkles-outline" size={25} color={C.purple}/><Spacer h={9}/>
      <Txt weight="900" size={18}>Discover PC games automatically</Txt><Spacer h={6}/>
      <Txt color={C.muted} size={13} style={{lineHeight:20}}>Popular PC games and new releases from Steam. Search by name and save games to your own offline collection. No Steam account required.</Txt>
    </View>
    <TextInput style={styles.textInput} placeholder="Search Steam PC games…" placeholderTextColor={C.dim} autoCapitalize="none" autoCorrect={false} value={query} onChangeText={setQuery}/>
    <Spacer h={19}/>
    <Section title={resultMode?'Steam search results':'Trending & new PC games'} right={loading||searching?<ActivityIndicator color={C.purple}/>:undefined}/>
    {resultMode ? (
      searchError?<Txt color={C.amber} size={12} style={{marginBottom:14}}>{searchError}</Txt>:
      searching?<Txt color={C.muted} size={12} style={{marginBottom:15}}>Searching Steam…</Txt>:
      results.length===0?<Empty title="No matching games" description="Try the exact PC game title or a shorter search." icon="search-outline"/>:results.map(renderListing)
    ) : (
      <>
        {onlineError?<Txt color={C.amber} size={12} style={{lineHeight:19,marginBottom:14}}>{onlineError}</Txt>:null}
        {featured.length>0 ? (
          <>
            <Txt color={C.muted} size={12} style={{marginBottom:15}}>{featured.length} live PC listings · excludes games already in your library</Txt>
            {top.length>0?top.map(renderListing):<Empty title="You're up to date" description="You've already added these recommendations to your collection."/>}
          </>
        ):loading?<Txt color={C.muted} size={12}>Loading new PC games…</Txt>:(
          <>
            <Section title="Offline suggestions"/>
            {DISCOVER_PICKS.map(p=>{
              const already=games.find(g=>normalizedTitle(g.title)===normalizedTitle(p.title));
              return <View key={p.title} style={{...styles.card,flexDirection:'row',gap:14,alignItems:'center',marginBottom:12}}>
                <GameCover game={p} width={79} height={103}/>
                <View style={{flex:1,gap:8}}><Txt weight="900" size={15}>{p.title}</Txt><Txt color={C.muted} size={12}>{p.genre}</Txt>
                  <Pressable onPress={()=>already?open(already):void add({...p,platform:'PC'})} disabled={adding===p.title}
                    style={{backgroundColor:already?C.surface2:C.purple,borderRadius:10,paddingVertical:9,paddingHorizontal:10,alignSelf:'flex-start'}}>
                    <Txt size={12} weight="bold" color={already?C.white:'#160E29'}>{already?'View in library':adding===p.title?'Adding…':'+ Add to wishlist'}</Txt>
                  </Pressable>
                </View>
              </View>;
            })}
          </>
        )}
      </>
    )}
    <Spacer h={18}/>
    <Txt color={C.dim} size={11} style={{lineHeight:18}}>Steam storefront listings are for discovery, not an indication that you own the game. Game availability and artwork require internet. Your saved collection remains offline.</Txt>
  </ScrollView>;
}
function Activity({open}: {open:(g:Game)=>void}) {
  const {games,sessions}=useStore();const minutes=sessions.reduce((n,s)=>n+s.minutes,0);
  return <ScrollView style={styles.screen} contentContainerStyle={styles.body}><Header subtitle="Your journey" title="Activity"/>
    <View style={{flexDirection:'row',gap:9}}><StatTile icon="stopwatch-outline" label="Sessions" value={String(sessions.length)}/><StatTile icon="hourglass-outline" label="Total Hours" value={`${Math.round(minutes/60*10)/10}`} accent={C.blue}/></View><Spacer h={26}/><Section title="Session timeline"/>
    {sessions.length ? sessions.map(s=>{
      const game=games.find(g=>g.id===s.game_id);
      return <Pressable key={s.id} onPress={()=>{if(game)open(game);}} style={{...styles.card,marginBottom:12,flexDirection:'row',gap:13}}>
        <View style={{backgroundColor:C.surface2,padding:11,borderRadius:13,alignSelf:'flex-start'}}><Icon name="game-controller" color={C.purple}/></View>
        <View style={{flex:1,gap:6}}><Txt weight="900" size={15}>{s.game_title??'Game'}</Txt><Txt color={C.blue} weight="bold" size={12}>{formatTime(s.minutes)} played</Txt>{!!s.notes && <Txt color={C.muted} size={12} style={{lineHeight:19}}>{s.notes}</Txt>}<Txt color={C.dim} size={11}>{new Date(s.played_at).toLocaleString()}</Txt></View>
      </Pressable>;
    }) : <Empty icon="pulse-outline" title="No sessions logged" description="Open a game and log a play session. Your activity will appear here."/>}
  </ScrollView>;
}
function Profile({add}: {add:()=>void}) {
  const {games,sessions,samplesPresent,clearSamples,backup,restore}=useStore();
  const [backupBusy,setBackupBusy]=useState(false);
  const handleExport=async()=>{
    if(backupBusy)return;setBackupBusy(true);
    try { await shareBackup(await backup()); }
    catch(e) { Alert.alert('Could not export backup', e instanceof Error?e.message:String(e)); }
    finally { setBackupBusy(false); }
  };
  const handleImport=async()=>{
    if(backupBusy)return;setBackupBusy(true);
    try {
      const data=await pickBackup();
      if(!data)return;
      Alert.alert('Replace your GameVault library?',
        `This backup contains ${data.games.length} games and ${data.sessions.length} sessions. Restoring replaces ALL games and sessions currently on this iPhone. Export a backup first if you want to keep them.`,
        [{text:'Cancel',style:'cancel'}, {text:'Replace and restore',style:'destructive',onPress:()=>{
          setBackupBusy(true);
          void restore(data).then(()=>Alert.alert('Backup restored','Your games and sessions have been restored on this iPhone.'))
            .catch(e=>Alert.alert('Restore failed',e instanceof Error?e.message:String(e)))
            .finally(()=>setBackupBusy(false));
        }}]);
    } catch(e) { Alert.alert('Could not import backup',e instanceof Error?e.message:String(e)); }
    finally { setBackupBusy(false); }
  };
  const favorites=games.filter(g=>g.favorite).length;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
    <Header subtitle="Personal control center" title="Your profile"/>
    <View style={{...styles.card,backgroundColor:'#1B2038',alignItems:'center',paddingVertical:30}}><View style={{width:70,height:70,borderRadius:23,backgroundColor:'#3B2C64',alignItems:'center',justifyContent:'center'}}><Icon name="person-outline" size={35} color={C.purple}/></View><Spacer h={13}/><Txt size={22} weight="900">Your Gaming Journey</Txt><Spacer h={6}/><Txt color={C.muted} size={12}>Private. Offline. Entirely yours.</Txt></View>
    <Spacer h={21}/><View style={{flexDirection:'row',gap:9}}><StatTile icon="albums-outline" label="Collection" value={String(games.length)}/><StatTile icon="heart-outline" label="Favorites" value={String(favorites)} accent={C.red}/></View>
    <Spacer h={23}/><Section title="App & privacy"/>
    <View style={styles.card}>
      <View style={{flexDirection:'row',gap:12,alignItems:'center'}}><Icon name="shield-checkmark-outline" size={24} color={C.green}/><View style={{flex:1}}><Txt weight="bold">Local-first storage</Txt><Spacer h={3}/><Txt color={C.muted} size={12} style={{lineHeight:18}}>Your games and sessions live on this device in SQLite. No login or server is required.</Txt></View></View>
      <Spacer h={18}/><View style={styles.thinDivider}/><Spacer h={18}/><View style={{flexDirection:'row',gap:12,alignItems:'center'}}><Icon name="cloud-offline-outline" size={24} color={C.blue}/><View style={{flex:1}}><Txt weight="bold">Offline mode</Txt><Spacer h={3}/><Txt color={C.muted} size={12}>Your library and activity work without internet.</Txt></View></View>
      <Spacer h={18}/><View style={styles.thinDivider}/><Spacer h={18}/><View style={{flexDirection:'row',gap:12,alignItems:'center'}}><Icon name="construct-outline" size={24} color={C.amber}/><View style={{flex:1}}><Txt weight="bold">Manual backup</Txt><Spacer h={3}/><Txt color={C.muted} size={12}>Save or restore your GameVault data with an iOS Files backup. Automatic cloud sync is not used.</Txt></View></View>
    </View>
    <Spacer h={22}/><Section title="Backup & restore"/>
    <View style={styles.card}><Txt color={C.muted} size={12} style={{lineHeight:20}}>Keep your progress safe. Export a JSON file to Files or iCloud Drive. Restoring a backup replaces the current collection, after your confirmation. You can also import JSON exported from the GameVault Safari preview.</Txt>
      <Spacer h={15}/><Btn title={backupBusy?'Please wait…':'Export my backup'} disabled={backupBusy} icon="share-outline" onPress={()=>void handleExport()}/>
      <Spacer h={10}/><Btn title="Import / restore from Files" disabled={backupBusy} icon="folder-open-outline" secondary onPress={()=>void handleImport()}/>
    </View>
    {samplesPresent && <><Spacer h={22}/><Section title="Sample collection"/><Txt color={C.muted} size={12} style={{lineHeight:20,marginBottom:13}}>Example games help you explore the app. Unmodified sample games can be removed. Any game you edited is kept.</Txt><Btn title="Remove unmodified examples" secondary icon="trash-outline" onPress={()=>Alert.alert('Remove sample games?','Unmodified examples will be deleted. Your newly added or edited games stay.',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>void clearSamples().catch(e=>Alert.alert('Error',String(e)))}])}/></>}
    <Spacer h={22}/><Btn title="Add a new game" onPress={add} icon="add-circle-outline"/><Spacer h={17}/><Txt color={C.dim} size={11} style={{textAlign:'center'}}>GameVault v0.3 · iPhone edition · {sessions.length} sessions recorded</Txt>
  </ScrollView>;
}
function EditGame({visible,onClose,onSave}: {visible:boolean;onClose:()=>void;onSave:(input:GameInput)=>Promise<void>}) {
  const [title,setTitle]=useState('');const [genre,setGenre]=useState('Action / Adventure');const [platform,setPlatform]=useState('ROG Ally');const [status,setStatus]=useState<GameStatus>('backlog');const [color,setColor]=useState(GAME_COLORS[0]);const [saving,setSaving]=useState(false);
  const submit=async()=>{if(!title.trim()){Alert.alert('Missing title','Please enter a game title.');return;}setSaving(true);try{await onSave({title,platform,genre,status,cover_color:color});setTitle('');setGenre('Action / Adventure');setStatus('backlog');onClose();}catch(e){Alert.alert('Could not save game',String(e));}finally{setSaving(false);}};
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><SafeAreaView style={styles.screen} edges={['top','bottom']}><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1}}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingHorizontal:22,paddingBottom:34}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:20}}><Txt size={25} weight="900">Add game</Txt><IconButton name="close" onPress={onClose}/></View><Txt color={C.muted} size={13} style={{marginTop:5}}>Build your collection, one game at a time.</Txt>
    <Txt color={C.muted} weight="bold" size={12} style={{marginTop:23,marginBottom:8}}>GAME TITLE *</Txt><TextInput autoCapitalize="words" placeholder="e.g. Far Cry 6" placeholderTextColor={C.dim} value={title} onChangeText={setTitle} style={styles.textInput} maxLength={120}/>
    <Txt color={C.muted} weight="bold" size={12} style={{marginTop:20,marginBottom:8}}>GENRE</Txt><TextInput placeholder="Genre" placeholderTextColor={C.dim} value={genre} onChangeText={setGenre} style={styles.textInput} maxLength={80}/>
    <Txt color={C.muted} weight="bold" size={12} style={{marginTop:20,marginBottom:10}}>PLATFORM</Txt><View style={{flexDirection:'row',flexWrap:'wrap'}}>{PLATFORM_OPTIONS.map(p=><Chip key={p} label={p} active={platform===p} onPress={()=>setPlatform(p)}/>)}</View>
    <Txt color={C.muted} weight="bold" size={12} style={{marginTop:13,marginBottom:9}}>STARTING STATUS</Txt><View style={{flexDirection:'row',flexWrap:'wrap'}}>{STATUSES.map(s=><Chip key={s.key} label={s.label} active={status===s.key} onPress={()=>setStatus(s.key)}/>)}</View>
    <Txt color={C.muted} weight="bold" size={12} style={{marginTop:15,marginBottom:10}}>COVER THEME</Txt><View style={{flexDirection:'row',flexWrap:'wrap',gap:11,marginBottom:26}}>{GAME_COLORS.map(c=><Pressable key={c} onPress={()=>setColor(c)} style={{width:35,height:35,borderRadius:12,backgroundColor:c,borderWidth:color===c?3:1,borderColor:color===c?'#FFFFFF':'#ffffff44'}}/>)}</View>
    <Btn title={saving?'Saving…':'Save game'} icon="checkmark-circle-outline" disabled={saving} onPress={()=>void submit()}/>
  </ScrollView></KeyboardAvoidingView></SafeAreaView></Modal>;
}
function GameDetail({game,onClose}: {game:Game;onClose:()=>void}) {
  const {games,sessions,update,remove,log}=useStore();const current=games.find(g=>g.id===game.id);
  const [sessionVisible,setSessionVisible]=useState(false);const [minutes,setMinutes]=useState('60');const [sessionNotes,setSessionNotes]=useState('');const [busy,setBusy]=useState(false);const [editNotes,setEditNotes]=useState(false);const [notes,setNotes]=useState(game.notes);
  if(!current)return null;
  const playSessions=sessions.filter(s=>s.game_id===current.id);
  const total=playSessions.reduce((a,b)=>a+b.minutes,0);
  const patch=async(p:Partial<Game>)=>{try{await update(current.id,p);}catch(e){Alert.alert('Update failed',String(e));}};
  const saveSession=async()=>{const n=Number(minutes);if(!Number.isInteger(n)||n<1||n>1440){Alert.alert('Invalid duration','Enter whole minutes between 1 and 1440.');return;}setBusy(true);try{await log(current.id,n,sessionNotes);setSessionVisible(false);setMinutes('60');setSessionNotes('');}catch(e){Alert.alert('Could not log session',String(e));}finally{setBusy(false);}};
  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><SafeAreaView style={styles.screen} edges={['top','bottom']}><ScrollView contentContainerStyle={{padding:22,paddingBottom:48}} keyboardShouldPersistTaps="handled">
    <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:21}}><IconButton name="close" onPress={onClose}/><Pressable onPress={()=>void patch({favorite:current.favorite?0:1})} style={{width:44,height:44,alignItems:'center',justifyContent:'center',backgroundColor:C.surface2,borderRadius:14}}><Icon name={current.favorite?'heart':'heart-outline'} color={current.favorite?C.red:C.white} size={25}/></Pressable></View>
    <View style={{alignItems:'center'}}><GameCover game={current} width={215} height={265} large/></View><Spacer h={20}/><Txt size={29} weight="900" style={{textAlign:'center'}}>{current.title}</Txt><Spacer h={8}/><Txt color={C.muted} style={{textAlign:'center'}}>{current.platform}  ·  {current.genre}</Txt>
    <Spacer h={21}/><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Txt weight="bold">Story progress</Txt><Txt color={C.green} weight="900">{current.progress}%</Txt></View><Spacer h={11}/><ProgressBar progress={current.progress} height={9} color={C.green}/><Spacer h={13}/>
    <View style={{flexDirection:'row',justifyContent:'space-between',gap:10}}><View style={{flex:1}}><Btn title="− 10%" secondary onPress={()=>void patch({progress:clampProgress(current.progress-10)})}/></View><View style={{flex:1}}><Btn title="+ 10%" secondary onPress={()=>void patch({progress:clampProgress(current.progress+10)})}/></View><View style={{flex:1}}><Btn title="100%" secondary onPress={()=>void patch({progress:100,status:'completed'})}/></View></View>
    <Spacer h={21}/><Txt color={C.muted} size={12} weight="bold">PLAY STATUS</Txt><Spacer h={11}/><View style={{flexDirection:'row',flexWrap:'wrap'}}>{STATUSES.map(s=><Chip key={s.key} label={s.label} active={current.status===s.key} onPress={()=>void patch({status:s.key,progress:s.key==='completed'?100:current.progress})} tint={statusColor(s.key)}/>)}</View>
    <Spacer h={18}/><View style={{flexDirection:'row',gap:9}}><StatTile icon="time-outline" label="Logged time" value={formatTime(total)}/><StatTile icon="pulse-outline" label="Sessions" value={String(playSessions.length)} accent={C.blue}/></View>
    <Spacer h={21}/><Btn title="Log a gaming session" icon="stopwatch-outline" onPress={()=>setSessionVisible(true)}/>
    <Spacer h={25}/><Section title="Your rating"/><View style={{flexDirection:'row',gap:8}}>{[1,2,3,4,5].map(n=><Pressable key={n} accessibilityLabel={`Rate ${n} stars`} onPress={()=>void patch({rating:n})} style={{padding:7}}><Icon name={n<=current.rating?'star':'star-outline'} size={30} color={C.amber}/></Pressable>)}</View>
    <Spacer h={21}/><Section title="Your notes" right={<Pressable onPress={()=>{setNotes(current.notes);setEditNotes(!editNotes);}}><Txt color={C.purple} weight="bold" size={12}>{editNotes?'Cancel':'Edit'}</Txt></Pressable>}/>
    {editNotes?<><TextInput value={notes} onChangeText={setNotes} multiline textAlignVertical="top" placeholder="Memorable moments, missions, review…" placeholderTextColor={C.dim} style={[styles.textInput,{height:125}]}/><Spacer h={12}/><Btn title="Save notes" onPress={()=>{void patch({notes});setEditNotes(false);}}/></>:<View style={styles.card}><Txt color={current.notes?C.white:C.dim} style={{lineHeight:21}}>{current.notes||'No notes yet. Capture your thoughts and favorite moments.'}</Txt></View>}
    <Spacer h={24}/><Section title="Previous sessions"/>{playSessions.length?playSessions.map(s=><View key={s.id} style={{...styles.card,marginBottom:9}}><Txt weight="bold">{formatTime(s.minutes)} · {new Date(s.played_at).toLocaleDateString()}</Txt>{!!s.notes&&<Txt color={C.muted} style={{marginTop:7}}>{s.notes}</Txt>}</View>):<Txt color={C.muted} size={13}>You haven't logged a play session yet.</Txt>}
    <Spacer h={33}/><Pressable onPress={()=>Alert.alert('Delete game?','This will also remove its sessions. This action cannot be undone.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>void remove(current.id).then(onClose).catch(e=>Alert.alert('Delete failed',String(e)))}])} style={{alignItems:'center',padding:15}}><Txt color={C.red} weight="bold">Delete game and its sessions</Txt></Pressable>
  </ScrollView>
  <Modal visible={sessionVisible} transparent animationType="fade" onRequestClose={()=>setSessionVisible(false)}><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,justifyContent:'center',backgroundColor:'#000000BD',padding:22}}><View style={{backgroundColor:C.surface,borderRadius:23,padding:23,borderWidth:1,borderColor:C.stroke}}>
    <Txt size={23} weight="900">Log your session</Txt><Spacer h={6}/><Txt color={C.muted} size={13}>{current.title}</Txt>
    <Txt color={C.muted} weight="bold" size={12} style={{marginTop:19,marginBottom:8}}>MINUTES PLAYED (1–1440)</Txt><TextInput keyboardType="number-pad" value={minutes} onChangeText={setMinutes} style={styles.textInput} maxLength={4}/>
    <Txt color={C.muted} weight="bold" size={12} style={{marginTop:19,marginBottom:8}}>NOTES (OPTIONAL)</Txt><TextInput multiline value={sessionNotes} onChangeText={setSessionNotes} placeholder="What happened this session?" placeholderTextColor={C.dim} textAlignVertical="top" style={[styles.textInput,{height:100}]}/><Spacer h={19}/><Btn title={busy?'Saving…':'Save session'} disabled={busy} onPress={()=>void saveSession()}/><Spacer h={9}/><Btn title="Cancel" secondary onPress={()=>setSessionVisible(false)}/>
  </View></KeyboardAvoidingView></Modal>
  </SafeAreaView></Modal>;
}
function Main() {
  const {games,loading,error,create}=useStore();const [tab,setTab]=useState<Tab>('home');const [addVisible,setAddVisible]=useState(false);const [selected,setSelected]=useState<string|null>(null);
  const active=useMemo(()=>games.find(g=>g.id===selected),[games,selected]);
  const open=(g:Game)=>setSelected(g.id);
  const createGame=async(input:GameInput)=>{await create(input);};
  if(loading)return <View style={{flex:1,backgroundColor:C.bg,justifyContent:'center',alignItems:'center',gap:18}}><Logo/><ActivityIndicator size="large" color={C.purple}/><Txt color={C.muted}>Opening your vault…</Txt></View>;
  if(error)return <View style={{flex:1,backgroundColor:C.bg,justifyContent:'center',padding:28}}><Icon name="alert-circle" color={C.red} size={44}/><Spacer h={16}/><Txt size={23} weight="900">Database unavailable</Txt><Spacer h={10}/><Txt color={C.muted}>{error}</Txt></View>;
  return <SafeAreaView style={styles.screen} edges={['top','bottom']}><StatusBar barStyle="light-content" backgroundColor={C.bg}/>
    <View style={{flex:1}}>
      {tab==='home'?<Home open={open} go={setTab} add={()=>setAddVisible(true)}/>:tab==='library'?<Library open={open} add={()=>setAddVisible(true)}/>:tab==='discover'?<Discover open={open} create={createGame}/>:tab==='activity'?<Activity open={open}/>:<Profile add={()=>setAddVisible(true)}/>}
    </View>
    <View style={{backgroundColor:'#111625',borderTopWidth:1,borderTopColor:C.stroke,flexDirection:'row',justifyContent:'space-around',paddingTop:11,paddingBottom:8}}>
      {TABS.map(t=><Pressable key={t.id} accessibilityLabel={t.label} accessibilityRole="tab" accessibilityState={{selected:tab===t.id}} onPress={()=>setTab(t.id)} style={{alignItems:'center',width:'19%',gap:5}}><Icon name={tab===t.id?t.active:t.icon} size={23} color={tab===t.id?C.purple:C.dim}/><Txt color={tab===t.id?C.white:C.dim} size={10} weight={tab===t.id?'bold':'normal'}>{t.label}</Txt></Pressable>)}
    </View>
    <EditGame visible={addVisible} onClose={()=>setAddVisible(false)} onSave={createGame}/>
    {active && <GameDetail game={active} onClose={()=>setSelected(null)}/>}
  </SafeAreaView>;
}
export default function App(){
  return <SafeAreaProvider><SQLiteProvider databaseName="gamevault.db" onInit={initializeDatabase}><StoreProvider><Main/></StoreProvider></SQLiteProvider></SafeAreaProvider>;
}