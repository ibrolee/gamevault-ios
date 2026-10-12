import {File,Paths} from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import type {VaultBackup} from './backup';
import {parseGameVaultImport} from './previewBackup';
export async function shareBackup(data:VaultBackup):Promise<void>{
 const file=new File(Paths.cache,`gamevault-backup-${new Date().toISOString().slice(0,10)}.json`);
 if(file.exists)file.delete();file.create();await file.write(JSON.stringify(data,null,2));
 if(!(await Sharing.isAvailableAsync()))throw Error('The iPhone share sheet is unavailable.');
 await Sharing.shareAsync(file.uri,{mimeType:'application/json',UTI:'public.json'});
}
export async function pickBackup():Promise<VaultBackup|null>{
 const result=await DocumentPicker.getDocumentAsync({type:['application/json','public.json','text/plain'],copyToCacheDirectory:true,multiple:false});
 if(result.canceled)return null;const a=result.assets?.[0];if(!a)throw Error('No file was selected.');
 if(a.size!=null&&a.size>12000000)throw Error('Backup exceeds the 12 MB safety limit.');
 return parseGameVaultImport(await new File(a.uri).text());
}
