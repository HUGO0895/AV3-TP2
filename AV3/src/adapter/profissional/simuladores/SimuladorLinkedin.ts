import { ErroNegocio } from "../../../erros";
import ApiProfissionalExterna from "./ApiProfissionalExterna";

/** LinkedIn simulado: perfis com `fullName`, `skills[{name,level}]`, `hourlyRate` e `available{from,to}`. */
export default class SimuladorLinkedin implements ApiProfissionalExterna{
    private perfis:any[]
    private notas=new Map<string,number[]>()
    constructor(perfis?:any[]){
        this.perfis=perfis ?? [
            {memberId:"li-1",fullName:"Ana Souza",skills:[{name:"Direção",level:5}],hourlyRate:5000,available:{from:"2026-01-01",to:"2026-12-31"}},
            {memberId:"li-2",fullName:"Carlos Lima",skills:[{name:"Edição",level:4}],hourlyRate:3000,available:{from:"2026-01-01",to:"2026-12-31"}},
        ]
    }
    buscarProfissionais(filtros:any):any[]{
        const skill=String(filtros?.competencia ?? "").toLowerCase()
        return this.perfis.filter((p)=>!skill || p.skills.some((s:any)=>s.name.toLowerCase()===skill)).map((p)=>({...p}))
    }
    obterPerfil(id:string):any{
        const p=this.perfis.find((x)=>x.memberId===id)
        if(!p) throw new ErroNegocio(`LinkedIn: perfil ${id} não encontrado`)
        return {...p}
    }
    avaliarProfissional(id:string,nota:number):void{
        this.obterPerfil(id)
        this.notas.set(id,[...(this.notas.get(id) ?? []),nota])
    }
    notasDe(id:string):number[]{ return this.notas.get(id) ?? [] }
}
