import Profissional from "../Equipe/Modelo/Profissional";
import Projeto from "../Projetos/Modelo/projetos";
import VisitanteProjeto from "./VisitanteProjeto";

export default class GeradorRelatorio implements VisitanteProjeto{
    visitarProfissional(profissional: Profissional):string {
        return `Profissional: ${profissional.nome} | Preço médio: ${profissional.precoMedio} | ` +
         `Disponibilidade: ${profissional.disponibiliade.inicio} a ${profissional.disponibiliade.final} | ` +
         `Competências: ${profissional.competencias.length} | Avaliações: ${profissional.avaliacoes.length}`
    }

    visitarProjeto(projeto: Projeto):string {
        const equipe=(projeto.equipe?.membrosEquipe ?? []).map((m)=>`${m.papel}: ${m.profissional.nome}`).join(", ")
        return `Projeto: ${projeto.tipo} (${projeto.genero}) | Duração mín: ${projeto.duracaoMin} | ` +
             `Orçamento: ${projeto.orcamento} | Prazo: ${projeto.prazo.toLocaleDateString()} | ` +
             `Equipe: ${equipe || "(sem equipe)"}`
    }
}
