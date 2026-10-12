import { StyleSheet } from 'react-native';
export const C={bg:'#080B14',surface:'#121727',surface2:'#192033',stroke:'#283047',white:'#F6F7FC',muted:'#A0A8BE',dim:'#707991',purple:'#9C7BFA',blue:'#40C1EE',green:'#4AD3A7',amber:'#EFC16D',red:'#F18788'};
export const styles=StyleSheet.create({
 screen:{flex:1,backgroundColor:C.bg},body:{paddingHorizontal:22,paddingBottom:34},
 kicker:{fontSize:11,fontWeight:'800',letterSpacing:2,color:C.purple},
 pageTitle:{fontSize:31,lineHeight:38,color:C.white,fontWeight:'900',letterSpacing:-.6,marginTop:4},
 description:{color:C.muted,fontSize:13,lineHeight:20},
 sectionHeading:{color:C.white,fontWeight:'800',fontSize:18},
 caption:{color:C.muted,fontSize:12},
 card:{borderRadius:21,padding:17,backgroundColor:C.surface,borderWidth:1,borderColor:C.stroke},
 thinDivider:{borderBottomWidth:1,borderBottomColor:C.stroke},
 textInput:{color:C.white,backgroundColor:'#1C2234',borderRadius:13,paddingHorizontal:14,paddingVertical:13,borderWidth:1,borderColor:'#343A4F',fontSize:15},
 fieldLabel:{color:C.muted,fontSize:12,fontWeight:'700',marginBottom:7,marginTop:16},
 primaryButton:{backgroundColor:C.purple,borderRadius:15,paddingHorizontal:18,paddingVertical:14,alignItems:'center',flexDirection:'row',justifyContent:'center',gap:8},
 secondaryButton:{backgroundColor:C.surface2,borderRadius:15,paddingHorizontal:14,paddingVertical:12,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,borderColor:C.stroke,borderWidth:1},
 buttonText:{color:'#130E26',fontWeight:'900',fontSize:14},
 smallPill:{paddingHorizontal:11,paddingVertical:7,borderRadius:99,backgroundColor:C.surface2,borderColor:C.stroke,borderWidth:1},
 sheet:{backgroundColor:C.bg,paddingHorizontal:22},sheetTitle:{color:C.white,fontSize:25,fontWeight:'900'}
});
export function statusColor(status:string):string {return ({playing:C.green,completed:C.blue,backlog:C.purple,paused:C.amber,dropped:C.red,wishlist:C.amber} as Record<string,string>)[status]??C.muted;}
