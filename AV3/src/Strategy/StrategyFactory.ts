import { ErroValidacao } from "../erros";
import FiltragemColaborativa from "./FiltragemColaborativa";
import RecomendacaoStrategy from "./RecomendacaoStrategy";
import RegrasOrcamento from "./RegrasOrcamento";
import SimiliaridadeCosseno from "./SimiliaridadedeCosseno";
import { aplicarDecoradores, NomeDecorator } from "../decorator/MontadorDecoradores";

type Criador = (parametros: Record<string, any>) => RecomendacaoStrategy

const registro: Record<string, Criador> = {
    similiaridadecosseno: (p) => new SimiliaridadeCosseno(p),
    filtragemcolaborativa: (p) => new FiltragemColaborativa(p),
    regrasdeorcamento: (p) => new RegrasOrcamento(p),
}

export const estrategiasDisponiveis = Object.keys(registro)

// Pilhas decoradas são reaproveitadas entre requisições (senão o cache nasceria vazio a cada chamada).
const pilhas=new Map<string,RecomendacaoStrategy>()

/**
 * Cria a estratégia pelo nome (escolha dinâmica), repassando parâmetros do algoritmo.
 * `parametros.decoradores` (ex.: ["cache","auditoria","compressao"]) empilha Decorators em tempo de execução.
 */
export function criarEstrategia(nome: string, parametros: Record<string, any> = {}): RecomendacaoStrategy {
    const criador = registro[nome.toLowerCase()]
    if (!criador) {
        throw new ErroValidacao(`Estratégia desconhecida: "${nome}". Use: ${estrategiasDisponiveis.join(", ")}`)
    }
    const { decoradores, cache, ...algoritmo } = parametros
    if (!Array.isArray(decoradores) || decoradores.length === 0) return criador(parametros)
    const chave = JSON.stringify([nome.toLowerCase(), algoritmo, decoradores, cache ?? null])
    let pilha = pilhas.get(chave)
    if (!pilha) {
        pilha = aplicarDecoradores(criador(algoritmo), { decoradores: decoradores as NomeDecorator[], cache })
        pilhas.set(chave, pilha)
    }
    return pilha
}
