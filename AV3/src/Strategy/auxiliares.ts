import { Papel } from "../Equipe/Enum/papel";
import Projeto from "../Projetos/Modelo/projetos";

export function papeisDoProjeto(projeto: Projeto): Papel[] {
    return projeto.competencias ? Array.from(projeto.competencias.keys()) : []
}

/** Fatia do orçamento reservada a um papel, proporcional ao peso de importância. */
export function orcamentoDoPapel(projeto: Projeto, papel: Papel): number {
    const total = papeisDoProjeto(projeto).reduce((acu, p) => acu + projeto.pesoDe(p), 0)
    return total > 0 ? (projeto.orcamento * projeto.pesoDe(papel)) / total : projeto.orcamento
}

export function normalizarTexto(texto: string): string {
    return texto.trim().toLocaleLowerCase()
}
