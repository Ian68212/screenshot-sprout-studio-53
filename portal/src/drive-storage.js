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

/** Inicia upload retomável no Google. A URL de sessão permanece apenas no servidor. */
export async function startResumableDriveUpload({category,name,mime,size}){
 const root=await folder(rootName),parent=await folder(category,root);
 const response=await google("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size",{
  method:"POST",
  headers:{"Content-Type":"application/json; charset=UTF-8","X-Upload-Content-Type":mime||"application/octet-stream","X-Upload-Content-Length":String(size)},
  body:JSON.stringify({name:String(name||"arquivo").slice(0,200),parents:[parent],description:"Arquivo privado do portal Rodrinox Pro"})
 });
 const location=response.headers.get("location");
 if(!location||!location.startsWith("https://www.googleapis.com/"))throw Error("Google Drive não retornou sessão de upload válida");
 return location;
}
/** Encaminha apenas um bloco; HTTP 308 indica que o Google espera mais dados. */
export async function appendResumableDriveChunk(sessionUrl,buffer,start,total,mime){
 if(!sessionUrl.startsWith("https://www.googleapis.com/"))throw Error("Sessão de upload inválida");
 const token=await driveAccessToken();
 const response=await fetch(sessionUrl,{method:"PUT",headers:{
  Authorization:"Bearer "+token,"Content-Type":mime||"application/octet-stream",
  "Content-Length":String(buffer.length),
  "Content-Range":"bytes "+start+"-"+(start+buffer.length-1)+"/"+total
 },body:buffer,redirect:"error"});
 if(response.status===308){
  const range=response.headers.get("range");
  return {complete:false,nextOffset:range?Number(range.split("-").at(-1))+1:0};
 }
 if(!response.ok)throw Error("Google Drive recusou bloco: HTTP "+response.status+" "+(await response.text()).slice(0,250));
 const data=await response.json();
 if(!data.id)throw Error("Google Drive não retornou identificador do arquivo");
 return {complete:true,id:data.id,nextOffset:total};
}

/** Download em streaming para não carregar arquivos grandes na RAM. */
export async function streamDriveFile(id,res){
 if(!/^[A-Za-z0-9_-]{10,}$/.test(String(id)))throw Error("Identificador inválido");
 const token=await driveAccessToken();
 const response=await fetch(api+"/"+encodeURIComponent(id)+"?alt=media",{
  headers:{Authorization:"Bearer "+token},redirect:"error"
 });
 if(!response.ok)throw Error("Falha ao baixar do Google Drive: HTTP "+response.status);
 const {Readable}=await import("node:stream");
 const {pipeline}=await import("node:stream/promises");
 await pipeline(Readable.fromWeb(response.body),res);
}
