import { Papel } from "../Equipe/Enum/papel";
import Profissional from "../Equipe/Modelo/Profissional";
import { logEstruturado } from "../logger";
import Projeto from "../Projetos/Modelo/projetos";
import RecomendacaoStrategy from "../Strategy/RecomendacaoStrategy";
import DecoratorRecomendacao from "./DecoratorRecomendacao";

export interface RegistroAuditoria{
    projetoId:string
    candidatos:number
    selecionados:Array<{papel:string,profissionalId:string}>
    duracaoMs:number
    sucesso:boolean
    erro?:string
}

/** Registra cada chamada (entrada, resultado, tempo e falhas) sem alterar o resultado. */
export default class AuditoriaDecorator extends DecoratorRecomendacao{
    public readonly registros:RegistroAuditoria[]=[]
    constructor(
        strategy:RecomendacaoStrategy,
        private destino:(registro:RegistroAuditoria)=>void=(r)=>logEstruturado(r.sucesso?"info":"error","auditoria_recomendacao",{...r}),
        private relogio:()=>number=()=>performance.now()
    ){ super(strategy) }

    recomendar(projeto:Projeto,profissionais:Array<Profissional>):Map<Papel,Profissional>{
        const inicio=this.relogio()
        const base={projetoId:projeto.getId(),candidatos:profissionais.length}
        try{
            const resultado=this.strategy.recomendar(projeto,profissionais)
            this.registrar({...base,selecionados:Array.from(resultado.entries()).map(([papel,p])=>({papel,profissionalId:p.getId()})),duracaoMs:this.relogio()-inicio,sucesso:true})
            return resultado
        }catch(erro){
            this.registrar({...base,selecionados:[],duracaoMs:this.relogio()-inicio,sucesso:false,erro:String(erro)})
            throw erro
        }
    }
    private registrar(r:RegistroAuditoria){ this.registros.push(r); this.destino(r) }
}
