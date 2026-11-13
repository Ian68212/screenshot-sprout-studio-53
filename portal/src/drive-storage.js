import crypto from "node:crypto";
import { driveAccessToken } from "./google-drive-oauth.js";

// Arquivos privados: não criar permissões públicas no Google Drive.
const api="https://www.googleapis.com/drive/v3/files";
const rootName="Rodrinox Pro - Portal";
const folders=new Map();
async function google(url,options={}){
 const token=await driveAccessToken();
 const response=await fetch(url,{...options,headers:{Authorization:"Bearer "+token,...options.headers}});
 if(!response.ok){
  const body=await response.text();
  throw Error("Google Drive HTTP "+response.status+": "+body.slice(0,400));
 }
 return response;
}
async function folder(name,parent){
 const cacheKey=(parent||"root")+":"+name;
 if(folders.has(cacheKey))return folders.get(cacheKey);
 const escaped=name.replace(/'/g,"\\'");
 const query="name = '"+escaped+"' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"+(parent?" and '"+parent+"' in parents":"");
 const url=new URL(api);url.searchParams.set("q",query);url.searchParams.set("fields","files(id,name)");url.searchParams.set("pageSize","10");
 const list=await (await google(url)).json();
 let id=list.files?.[0]?.id;
 if(!id){
  const body={name,mimeType:"application/vnd.google-apps.folder"};
  if(parent)body.parents=[parent];
  const created=await (await google(api+"?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})).json();
  id=created.id;
 }
 folders.set(cacheKey,id);return id;
}
export async function uploadDriveFile({category,name,mime,buffer}){
 if(!Buffer.isBuffer(buffer)||!buffer.length)throw Error("Arquivo vazio");
 if(buffer.length>25*1024*1024)throw Error("Arquivo acima de 25 MB");
 const root=await folder(rootName);
 const parent=await folder(category,root);
 const metadata={name:String(name||"arquivo").slice(0,200),parents:[parent],description:"Arquivo privado do portal Rodrinox Pro"};
 const boundary="rp"+crypto.randomUUID().replace(/-/g,"");
 const head=Buffer.from("--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+JSON.stringify(metadata)+"\r\n--"+boundary+"\r\nContent-Type: "+(mime||"application/octet-stream")+"\r\n\r\n");
 const tail=Buffer.from("\r\n--"+boundary+"--");
 const body=Buffer.concat([head,buffer,tail]);
 const response=await google("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size",{method:"POST",headers:{"Content-Type":"multipart/related; boundary="+boundary},body});
 return (await response.json()).id;
}
export async function readDriveFile(id){
 if(!/^[A-Za-z0-9_-]{10,}$/.test(String(id)))throw Error("Identificador de arquivo inválido");
 const response=await google(api+"/"+encodeURIComponent(id)+"?alt=media");
 return Buffer.from(await response.arrayBuffer());
}
export async function deleteDriveFile(id){
 if(!/^[A-Za-z0-9_-]{10,}$/.test(String(id)))throw Error("Identificador de arquivo inválido");
 await google(api+"/"+encodeURIComponent(id),{method:"DELETE"});
}
