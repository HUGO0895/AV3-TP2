import { Papel } from "../Equipe/Enum/papel";
import Profissional from "../Equipe/Modelo/Profissional";
import Projeto from "../Projetos/Modelo/projetos";
import RecomendacaoStrategy from "../Strategy/RecomendacaoStrategy";
import DecoratorRecomendacao from "./DecoratorRecomendacao";

export interface OpcoesCache{
    /** Validade de cada entrada em ms (padrão 60 s). */
    ttlMs?:number
    agora?:()=>number
}

/** Guarda o resultado de requisições idênticas (mesmo projeto e mesmos candidatos) por um tempo. */
export default class CacheDecorator extends DecoratorRecomendacao{
    private entradas=new Map<string,{resultado:Map<Papel,Profissional>,em:number}>()
    private ttlMs:number
    private agora:()=>number
    public acertos=0
    public erros=0

    constructor(strategy:RecomendacaoStrategy,opcoes:OpcoesCache={}){
        super(strategy)
        this.ttlMs=opcoes.ttlMs ?? 60_000
        this.agora=opcoes.agora ?? Date.now
    }

    recomendar(projeto:Projeto,profissionais:Array<Profissional>):Map<Papel,Profissional>{
        const chave=CacheDecorator.chave(projeto,profissionais)
        const guardado=this.entradas.get(chave)
        if(guardado && this.agora()-guardado.em<this.ttlMs){
            this.acertos++
            return new Map(guardado.resultado)
        }
        this.erros++
        const resultado=this.strategy.recomendar(projeto,profissionais)
        this.entradas.set(chave,{resultado:new Map(resultado),em:this.agora()})
        return resultado
    }

    limpar():void{ this.entradas.clear() }

    /** Identidade da requisição: tudo o que influencia o resultado (e não o objeto em si). */
    private static chave(projeto:Projeto,profissionais:Array<Profissional>):string{
        const mapa=(m?:Map<Papel,unknown>)=>m ? Array.from(m.entries()).map(([k,v])=>[k,v]).sort((a:any,b:any)=>String(a[0]).localeCompare(String(b[0]))) : []
        return JSON.stringify({
            projeto:[projeto.getId(),projeto.tipo,projeto.genero,projeto.orcamento,projeto.prazo.getTime()],
            competencias:mapa(projeto.competencias),
            pesos:mapa(projeto.pesos),
            profissionais:profissionais.map((p)=>[p.getId(),p.precoMedio,p.disponibiliade.inicio.getTime(),p.disponibiliade.final.getTime(),p.competencias.map((c)=>[c.nome,c.nivel])]),
        })
    }
}
