import { ErroNegocio } from "../../../erros";
import ApiProfissionalExterna from "./ApiProfissionalExterna";

/** Cadastro interno simulado: formato próprio (`id`, `nome`, `competencias{nome:nivel}`, `preco`, `inicio`/`fim`). */
export default class SimuladorInterno implements ApiProfissionalExterna{
    private registros:any[]
    private notas=new Map<string,number[]>()
    constructor(registros?:any[]){
        this.registros=registros ?? [
            {id:"in-1",nome:"Beatriz Rocha",competencias:{"Som":5},preco:2500,inicio:"2026-01-01",fim:"2026-12-31"},
            {id:"in-2",nome:"Diego Melo",competencias:{"Direção":4,"Roteiro":3},preco:4000,inicio:"2026-01-01",fim:"2026-12-31"},
        ]
    }
    buscarProfissionais(filtros:any):any[]{
        const c=String(filtros?.competencia ?? "").toLowerCase()
        return this.registros.filter((r)=>!c || Object.keys(r.competencias).some((k)=>k.toLowerCase()===c)).map((r)=>({...r}))
    }
    obterPerfil(id:string):any{
        const r=this.registros.find((x)=>x.id===id)
        if(!r) throw new ErroNegocio(`Cadastro interno: profissional ${id} não encontrado`)
        return {...r}
    }
    avaliarProfissional(id:string,nota:number):void{
        this.obterPerfil(id)
        this.notas.set(id,[...(this.notas.get(id) ?? []),nota])
    }
    notasDe(id:string):number[]{ return this.notas.get(id) ?? [] }
}
