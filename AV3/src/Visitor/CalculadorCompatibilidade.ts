import Profissional from "../Equipe/Modelo/Profissional";
import Projeto from "../Projetos/Modelo/projetos";
import VisitanteProjeto from "./VisitanteProjeto";

function mediaNotas(profissional: Profissional): number {
    const avaliacoes = profissional.avaliacoes
    if (avaliacoes.length === 0) return 0
    return avaliacoes.reduce((acu, av) => acu + av.notaDoProfissional, 0) / avaliacoes.length
}

export default class CalculadorCompatibilidade implements VisitanteProjeto{
    visitarProfissional(profissional: Profissional):number {
        return Math.floor(mediaNotas(profissional))
    }

    visitarProjeto(projeto: Projeto):number[] {
        return (projeto.equipe?.membrosEquipe ?? []).map((mem)=>mediaNotas(mem.profissional))
    }
}
