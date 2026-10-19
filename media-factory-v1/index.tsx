import React from 'react';
import {AbsoluteFill, Audio, Composition, registerRoot, staticFile, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import data from './contracts.json';
import words from './words.json';
const ink='#edf3f6', gold='#e7bf75';
const panel: React.CSSProperties={padding:36,border:'2px solid #3a5265',borderRadius:24,background:'#122739',marginBottom:24};
const Diagram:React.FC=()=>{
 const frame=useCurrentFrame(); const {fps}=useVideoConfig();const ms=frame/fps*1000;
 const index=Math.max(0,data.units.findLastIndex(u=>ms>=u.startMs));const u=data.units[index];
 const wordIndex=words.findLastIndex(w=>ms>=w.startMs);const captionStart=Math.floor(Math.max(0,wordIndex)/5)*5;const caption=wordIndex>=0?words.slice(captionStart,captionStart+5):[];
 const opacity=interpolate(ms,[u.startMs,u.startMs+180],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 const card=(title:string,body:string,active=false)=><div style={{...panel,borderColor:active?gold:'#3a5265'}}><div style={{color:gold,fontSize:34,marginBottom:18}}>{title}</div><div style={{fontSize:43,lineHeight:1.28}}>{body}</div></div>;
 const a=card('Relato A','«Me estafaron; son delincuentes».',index===2);
 const b=card('Relato B','Entrega · Promesa · Comunicaciones · Comprobantes',index>=4);
 return <AbsoluteFill style={{background:'linear-gradient(150deg,#07131f,#143449)',color:ink,fontFamily:'Arial',padding:'110px 76px 110px'}}>
 <Audio src={staticFile('media-factory-v1/narration.mp3')}/>
 <div style={{fontSize:28,color:gold,letterSpacing:2}}>Ejemplo hipotético · Revisión interna</div>
 <div style={{fontSize:62,fontWeight:700,lineHeight:1.12,marginTop:45,marginBottom:55}}>Dos relatos.<br/>¿Qué permite verificar cada uno?</div>
 <div style={{opacity}}>
 {index===0?<>{card('Una misma situación','Dos personas describen un supuesto fraude.')}{card('Dos relatos','A y B')}</>:null}
 {index===1?<>{card('Hechos verificables','Datos que pueden contrastarse')}{card('Sospechas','Aspectos todavía no comprobados')}</>:null}
 {index===2?<>{a}{card('Afirmación de la persona','La frase se muestra como una cita atribuida.')}</>:null}
 {index===3?<>{card('Hechos verificables','Qué ocurrió')}{card('Elementos de corroboración','Con qué contrastarlo')}{card('Sospechas','Qué falta comprobar')}</>:null}
 {index===4?<>{['Entrega del dinero','Lo prometido','Comunicaciones','Comprobantes'].map((s,i)=><React.Fragment key={s}>{card(String(i+1),s)}</React.Fragment>)}</>:null}
 {index>=5?<>{a}{b}{index===6?card('El segundo relato','Ofrece hechos comprobables.',true):null}</>:null}
 </div>
 <div style={{position:'absolute',bottom:240,left:76,right:76,fontSize:43,lineHeight:1.3,background:'#07131f',padding:22,borderRadius:16}}>{caption.map((w,i)=><span key={w.startMs} style={{color:captionStart+i===wordIndex?gold:ink}}>{w.text} </span>)}</div>
 <div style={{position:'absolute',bottom:100,left:76,right:76,fontSize:34,color:'#c5d5df'}}>Francisco Alejandro Riveros Düllmann</div>
 </AbsoluteFill>;
};
const Root:React.FC=()=> <Composition id="MFV1Video032" component={Diagram} width={1080} height={1920} fps={30} durationInFrames={813}/>;
registerRoot(Root);
