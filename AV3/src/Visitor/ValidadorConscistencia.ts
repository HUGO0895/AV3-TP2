import Profissional from "../Equipe/Modelo/Profissional";
import Projeto from "../Projetos/Modelo/projetos";
import { papeisDoProjeto } from "../Strategy/auxiliares";
import VisitanteProjeto from "./VisitanteProjeto";

export default class ValidadorConscistencia implements VisitanteProjeto{
    visitarProfissional(profissional: Profissional):boolean {
         return profissional.competencias.length>0
    }

    /** Há equipe, todos os papéis obrigatórios estão preenchidos e o orçamento é suficiente. */
    visitarProjeto(projeto: Projeto):boolean {
        const membros=projeto.equipe?.membrosEquipe ?? []
        if(membros.length===0) return false
        const preenchidos=new Set(membros.map((m)=>m.papel))
        if(papeisDoProjeto(projeto).some((papel)=>!preenchidos.has(papel))) return false
        const custo=membros.reduce((acu,m)=>acu+m.profissional.precoMedio,0)
        return custo<=projeto.orcamento
    }
}
