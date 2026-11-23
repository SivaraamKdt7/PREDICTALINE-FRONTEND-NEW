import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import Busboy from 'busboy';
import type { Plugin } from 'vite';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
type StoredModel = { id:string; componentPath:string; componentName:string; modelUrl:string; name:string; assetId:string; description:string; tags:string; size:number; visible:boolean; wireframe:boolean; castShadow:boolean; receiveShadow:boolean; position:[number,number,number]; rotation:[number,number,number]; scale:[number,number,number] };
const send = (res:ServerResponse, data:unknown, status=200) => { if(res.writableEnded)return;res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data)); };
const fail = (res:ServerResponse, status:number, message:string) => send(res,{error:message},status);
const safeId = (id:string) => /^[a-f0-9-]{36}$/i.test(id);
const readModel = (dir:string,id:string):StoredModel => JSON.parse(fs.readFileSync(path.join(dir,`${id}.json`),'utf8')) as StoredModel;
const listModels = (dir:string):StoredModel[] => fs.readdirSync(dir).filter(f=>/^[a-f0-9-]{36}\.json$/i.test(f)).flatMap(f=>{try{return [readModel(dir,path.basename(f,'.json'))]}catch{return []}}).sort((a,b)=>a.name.localeCompare(b.name));
const readBody = async (req:IncomingMessage) => {let body='';for await(const chunk of req){body+=String(chunk);if(body.length>1024*1024)throw new Error('Request too large')}return JSON.parse(body) as Record<string,unknown>};
const vector = (value:unknown, fallback:[number,number,number]):[number,number,number] => Array.isArray(value)&&value.length===3&&value.every(x=>typeof x==='number'&&Number.isFinite(x))?value as [number,number,number]:fallback;

function register(middlewares:{use:(path:string, handler:(req:IncomingMessage,res:ServerResponse)=>void)=>void}) {
  const dir=path.resolve(process.cwd(),'public/models');
  fs.mkdirSync(dir,{recursive:true});

  middlewares.use('/api/models',(req,res)=>{void (async()=>{
    const raw=req.url||'/';
    const route=decodeURIComponent(raw.split('?')[0].replace(/^\//,''));
    const duplicateRoute=route.match(/^([a-f0-9-]{36})\/duplicate$/i);
    if(req.method==='POST'&&duplicateRoute){
      const sourceId=duplicateRoute[1];
      if(!fs.existsSync(path.join(dir,`${sourceId}.json`))){fail(res,404,'Model not found');return}
      const source=readModel(dir,sourceId);const copyId=randomUUID();
      fs.copyFileSync(path.join(dir,path.basename(source.modelUrl)),path.join(dir,`${copyId}.glb`));
      const copy:StoredModel={...source,id:copyId,componentName:`Model_${copyId.replace(/-/g,'')}`,modelUrl:`/models/${copyId}.glb`,name:`${source.name} copy`,position:[source.position[0]+1,source.position[1],source.position[2]]};
      fs.writeFileSync(path.join(dir,`${copyId}.json`),JSON.stringify(copy,null,2));send(res,copy);return;
    }
    const id=route;
    if(req.method==='GET'&&(!id||id==='/')){send(res,listModels(dir));return}
    if(!safeId(id)){fail(res,404,'Model not found');return}
    const metaPath=path.join(dir,`${id}.json`);
    if(!fs.existsSync(metaPath)){fail(res,404,'Model not found');return}
    if(req.method==='PATCH'){
      const changes=await readBody(req);
      const current=readModel(dir,id);
      const updated:StoredModel={...current,
        name:typeof changes.name==='string'?changes.name.slice(0,120):current.name,
        assetId:typeof changes.assetId==='string'?changes.assetId.slice(0,120):current.assetId,
        description:typeof changes.description==='string'?changes.description.slice(0,1000):current.description,
        tags:typeof changes.tags==='string'?changes.tags.slice(0,300):current.tags,
        visible:typeof changes.visible==='boolean'?changes.visible:current.visible,
        wireframe:typeof changes.wireframe==='boolean'?changes.wireframe:current.wireframe,
        castShadow:typeof changes.castShadow==='boolean'?changes.castShadow:current.castShadow,
        receiveShadow:typeof changes.receiveShadow==='boolean'?changes.receiveShadow:current.receiveShadow,
        position:vector(changes.position,current.position),rotation:vector(changes.rotation,current.rotation),scale:vector(changes.scale,current.scale)};
      fs.writeFileSync(metaPath,JSON.stringify(updated,null,2));send(res,updated);return;
    }
    if(req.method==='DELETE'){
      const model=readModel(dir,id);
      fs.rmSync(metaPath,{force:true});
      const glb=path.join(dir,path.basename(model.modelUrl));
      fs.rmSync(glb,{force:true});send(res,{deleted:id});return;
    }
    fail(res,405,'Method not allowed');
  })().catch(error=>fail(res,500,error instanceof Error?error.message:'Model request failed'))});

  middlewares.use('/api/upload-model',(req,res)=>{
    if(req.method!=='POST'){fail(res,405,'Method not allowed');return}
    if(!req.headers['content-type']?.includes('multipart/form-data')){fail(res,400,'Expected multipart/form-data');return}
    const id=randomUUID();
    const glbPath=path.join(dir,`${id}.glb`);
    const fields:Record<string,string>={};
    let originalName='';let uploadError='';let write:Promise<void>|null=null;
    const bb=Busboy({headers:req.headers,limits:{files:1,fileSize:MAX_FILE_SIZE,fields:10}});
    bb.on('field',(name,value)=>{fields[name]=value.slice(0,1000)});
    bb.on('file',(name,file,info)=>{
      if(name!=='model'||!info.filename.toLowerCase().endsWith('.glb')){uploadError='Only a .glb file in the model field is supported';file.resume();return}
      originalName=path.basename(info.filename.replace(/\\/g,'/'));
      file.on('limit',()=>{uploadError='File exceeds the 50 MB limit'});
      write=pipeline(file,fs.createWriteStream(glbPath)).catch(error=>{uploadError=error instanceof Error?error.message:'Upload failed'});
    });
    bb.on('filesLimit',()=>{uploadError='Only one file is allowed'});
    bb.on('error',error=>{uploadError=error.message});
    bb.on('close',()=>{void (async()=>{
      if(write)await write;
      if(uploadError||!originalName||!fs.existsSync(glbPath))throw new Error(uploadError||'No model uploaded');
      const size=fs.statSync(glbPath).size;
      if(size<20)throw new Error('Invalid GLB file');
      const header=Buffer.alloc(12);const fd=fs.openSync(glbPath,'r');try{fs.readSync(fd,header,0,12,0)}finally{fs.closeSync(fd)}
      if(header.toString('utf8',0,4)!=='glTF'||header.readUInt32LE(4)!==2||header.readUInt32LE(8)!==size)throw new Error('Invalid GLB 2.0 file');
      const chunk=Buffer.alloc(8);const chunkFd=fs.openSync(glbPath,'r');try{fs.readSync(chunkFd,chunk,0,8,12)}finally{fs.closeSync(chunkFd)}
      const jsonLength=chunk.readUInt32LE(0);
      if(chunk.toString('utf8',4,8)!=='JSON'||jsonLength<2||jsonLength>size-20)throw new Error('GLB JSON chunk is invalid');
      const jsonBuffer=Buffer.alloc(jsonLength);const jsonFd=fs.openSync(glbPath,'r');try{fs.readSync(jsonFd,jsonBuffer,0,jsonLength,20)}finally{fs.closeSync(jsonFd)}
      const gltf=JSON.parse(jsonBuffer.toString('utf8')) as {asset?:{version?:string}};
      if(gltf.asset?.version!=='2.0')throw new Error('GLB asset must be glTF 2.0');
      const name=(fields.name||originalName.replace(/\.glb$/i,'')).trim().slice(0,120)||'Model';
      const model:StoredModel={id,componentPath:'',componentName:`Model_${id.replace(/-/g,'')}`,modelUrl:`/models/${id}.glb`,name,assetId:(fields.assetId||'').slice(0,120),description:(fields.description||'').slice(0,1000),tags:(fields.tags||'').slice(0,300),size,visible:true,wireframe:false,castShadow:true,receiveShadow:true,position:[listModels(dir).length*3.5,0,0],rotation:[0,0,0],scale:[1,1,1]};
      fs.writeFileSync(path.join(dir,`${id}.json`),JSON.stringify(model,null,2));send(res,model);
    })().catch(error=>{fs.rmSync(glbPath,{force:true});fail(res,400,error instanceof Error?error.message:'Upload failed')})});
    req.pipe(bb);
  });
}

export default function modelUploadPlugin():Plugin {return {name:'model-upload',configureServer(server){register(server.middlewares)},configurePreviewServer(server){register(server.middlewares)}}}
