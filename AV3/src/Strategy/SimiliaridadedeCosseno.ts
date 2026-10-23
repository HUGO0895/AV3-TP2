import { Papel } from "../Equipe/Enum/papel";
import Competencias from "../Equipe/Modelo/Competencias";
import Profissional from "../Equipe/Modelo/Profissional";
import Projeto from "../Projetos/Modelo/projetos";
import RecomendacaoStrategy from "./RecomendacaoStrategy";
import { normalizarTexto, orcamentoDoPapel, papeisDoProjeto } from "./auxiliares";

export interface OpcoesCosseno {
    /** Similaridade mínima (0 a 1) para um profissional ser elegível. Padrão: 0. */
    limiarMinimo?: number
}

export default class SimiliaridadeCosseno implements RecomendacaoStrategy{
    private limiarMinimo: number

    constructor(opcoes: OpcoesCosseno = {}) {
        this.limiarMinimo = opcoes.limiarMinimo ?? 0
    }

    recomendar(projeto: Projeto, profissionais: Array<Profissional>): Map<Papel, Profissional> {
        const mapaEquipe=new Map<Papel,Profissional>()
        const usados=new Set<string>()
        for(const papel of papeisDoProjeto(projeto)){
            const teto=orcamentoDoPapel(projeto,papel)
            const candidatos=profissionais.filter((p)=>!usados.has(p.getId()) && p.precoMedio<=teto)
            const escolhido=this.melhorEscolhaParaCadaPapel(candidatos,projeto.competencias?.get(papel) ?? [])
            if(escolhido){
                mapaEquipe.set(papel,escolhido)
                usados.add(escolhido.getId())
            }
        }
        return mapaEquipe
    }

    melhorEscolhaParaCadaPapel(profissionais:Array<Profissional>,competencias:Array<Competencias>):Profissional|undefined{
        const exigidas=new Map<string,number>()
        for(const c of competencias) exigidas.set(normalizarTexto(c.nome),c.nivel)
        const normaPapel=Math.sqrt(Array.from(exigidas.values()).reduce((acu,n)=>acu+n*n,0))

        let melhor:Profissional|undefined
        let melhorNota=-1
        for(const profissional of profissionais){
            let produto=0
            let somaQuadrados=0
            for(const c of profissional.competencias){
                const nivelExigido=exigidas.get(normalizarTexto(c.nome))
                if(nivelExigido!==undefined) produto+=nivelExigido*c.nivel
                somaQuadrados+=c.nivel*c.nivel
            }
            const denominador=normaPapel*Math.sqrt(somaQuadrados)
            const similaridade=denominador===0?0:produto/denominador
            if(similaridade>=this.limiarMinimo && similaridade>melhorNota){
                melhor=profissional
                melhorNota=similaridade
            }
        }
        return melhor
    }
}
