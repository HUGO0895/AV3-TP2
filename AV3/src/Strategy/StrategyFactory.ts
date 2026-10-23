import { ErroValidacao } from "../erros";
import FiltragemColaborativa from "./FiltragemColaborativa";
import RecomendacaoStrategy from "./RecomendacaoStrategy";
import RegrasOrcamento from "./RegrasOrcamento";
import SimiliaridadeCosseno from "./SimiliaridadedeCosseno";

type Criador = (parametros: Record<string, any>) => RecomendacaoStrategy

const registro: Record<string, Criador> = {
    similiaridadecosseno: (p) => new SimiliaridadeCosseno(p),
    filtragemcolaborativa: (p) => new FiltragemColaborativa(p),
    regrasdeorcamento: (p) => new RegrasOrcamento(p),
}

export const estrategiasDisponiveis = Object.keys(registro)

/** Cria a estratégia pelo nome (escolha dinâmica), repassando parâmetros do algoritmo. */
export function criarEstrategia(nome: string, parametros: Record<string, any> = {}): RecomendacaoStrategy {
    const criador = registro[nome.toLowerCase()]
    if (!criador) {
        throw new ErroValidacao(`Estratégia desconhecida: "${nome}". Use: ${estrategiasDisponiveis.join(", ")}`)
    }
    return criador(parametros)
}
