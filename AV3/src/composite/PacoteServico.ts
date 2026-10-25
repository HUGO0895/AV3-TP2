import ServicoAtomico from "./ServicoAtomico";
import ServicoProjeto from "./ServicoProjeto";
import { ErroValidacao } from "../erros";

/** Composto: contém atômicos ou outros pacotes, tratados pela mesma interface. */
export default class PacoteServico implements ServicoProjeto{
    private lista:ServicoProjeto[]
    constructor(public readonly nome:string,lista:ServicoProjeto[]=[],private prazoLimite?:Date){
        this.lista=[...lista]
    }

    adicionar(servico:ServicoProjeto):this{
        if(servico===this || (servico instanceof PacoteServico && servico.contem(this))){
            throw new ErroValidacao("Um pacote não pode conter a si mesmo (ciclo)")
        }
        this.lista.push(servico)
        return this
    }
    remover(servico:ServicoProjeto):boolean{
        const i=this.lista.indexOf(servico)
        if(i<0) return false
        this.lista.splice(i,1)
        return true
    }

    calcularCusto():number{ return this.lista.reduce((acu,s)=>acu+s.calcularCusto(),0) }
    listarSubservicos():ServicoProjeto[]{ return [...this.lista] }
    obterPrazo():Date[]{ return this.lista.flatMap((s)=>s.obterPrazo()) }

    /** Todos os serviços atômicos da hierarquia (achatada). */
    atomicos():ServicoAtomico[]{
        return this.lista.flatMap((s)=>s instanceof PacoteServico ? s.atomicos() : s instanceof ServicoAtomico ? [s] : [])
    }
    /** Profundidade da hierarquia (pacote sem filhos = 1). */
    profundidade():number{
        return 1+Math.max(0,...this.lista.map((s)=>s instanceof PacoteServico ? s.profundidade() : 0))
    }

    /** Válido se não vazio, todos os filhos válidos e (quando há limite) nenhum prazo o ultrapassa. */
    validar():boolean{
        if(this.lista.length===0) return false
        if(!this.lista.every((s)=>s.validar())) return false
        if(this.prazoLimite && this.obterPrazo().some((d)=>d.getTime()>this.prazoLimite!.getTime())) return false
        return true
    }

    private contem(alvo:ServicoProjeto):boolean{
        return this.lista.some((s)=>s===alvo || (s instanceof PacoteServico && s.contem(alvo)))
    }
}
