import { Papel } from "../Equipe/Enum/papel";
import Profissional from "../Equipe/Modelo/Profissional";
import Projeto from "../Projetos/Modelo/projetos";
import RecomendacaoStrategy from "./RecomendacaoStrategy";
import { orcamentoDoPapel, papeisDoProjeto } from "./auxiliares";

export interface OpcoesFiltragem {
    /** Mínimo de avaliações no papel para o profissional ser considerado. Padrão: 1. */
    minAvaliacoes?: number
}

export default class FiltragemColaborativa implements RecomendacaoStrategy{
    private minAvaliacoes: number

    constructor(opcoes: OpcoesFiltragem = {}) {
        this.minAvaliacoes = Math.max(1, opcoes.minAvaliacoes ?? 1)
    }

    recomendar(projeto: Projeto, profissionais: Array<Profissional>): Map<Papel, Profissional> {
        const mapaEquipe=new Map<Papel,Profissional>()
        const usados=new Set<string>()
        for(const papel of papeisDoProjeto(projeto)){
            const teto=orcamentoDoPapel(projeto,papel)
            let melhor:{prof:Profissional,media:number,total:number}|undefined
            for(const profissional of profissionais){
                if(usados.has(profissional.getId()) || profissional.precoMedio>teto) continue
                const notas=profissional.avaliacoes.filter((a)=>a.papel===papel)
                if(notas.length<this.minAvaliacoes) continue
                const media=notas.reduce((acu,a)=>acu+a.notaDoProfissional,0)/notas.length
                const melhorQue = !melhor
                    || media>melhor.media
                    || (media===melhor.media && notas.length>melhor.total)
                if(melhorQue) melhor={prof:profissional,media,total:notas.length}
            }
            if(melhor){
                mapaEquipe.set(papel,melhor.prof)
                usados.add(melhor.prof.getId())
            }
        }
        return mapaEquipe
    }
}
