import { FastifyReply, FastifyRequest } from "fastify";
import Competencias from "../Equipe/Modelo/Competencias";
import { Papel } from "../Equipe/Enum/papel";
import { ErroValidacao } from "../erros";
import { Genero } from "../Projetos/Enum/TipoGenero";
import { TipoProjeto } from "../Projetos/Enum/TipoProjeto";
import Projeto from "../Projetos/Modelo/projetos";
import ServiceRecomendacao, { EquipeAtualDTO } from "../servico/ServiceRecomendacao";
import RegistroFabricas from "../Fabricas/RegistroFabricas";
import { criarEstrategia, estrategiasDisponiveis } from "../Strategy/StrategyFactory";
/*  Faz o L */
const propriedadesProjeto = {
    id: { type: 'number' },
    genero: { type: 'string', enum: Object.values(Genero) },
    tipo: { type: 'string', enum: Object.values(TipoProjeto) },
    duracaoMin: { type: 'number', exclusiveMinimum: 0 },
    orcamento: { type: 'number', exclusiveMinimum: 0 },
    prazo: { type: 'string', format: 'date-time' },
    competencias: {
        type: 'object',
        minProperties: 1,
        additionalProperties: {
            type: 'array',
            items: {
                type: 'object',
                required: ['nome', 'nivel'],
                properties: { nome: { type: 'string' }, nivel: { type: 'number', minimum: 1, maximum: 5 } }
            }
        }
    },
    pesos: { type: 'object', additionalProperties: { type: 'number', exclusiveMinimum: 0 } },
    estrategia: { type: 'string', enum: estrategiasDisponiveis },
    parametros: { type: 'object' },
    detalhes: { type: 'object' },
}
const obrigatoriosProjeto = ['id', 'genero', 'tipo', 'duracaoMin', 'orcamento', 'prazo', 'competencias', 'estrategia']

export const projetoRecomendacao = {
    body: { type: 'object', required: obrigatoriosProjeto, properties: propriedadesProjeto }
}

const idSchema = { anyOf: [{ type: 'string' }, { type: 'number' }] }

const equipeAtual = {
    type: 'object',
    minProperties: 1,
    additionalProperties: {
        type: 'object',
        required: ['profissionalId'],
        properties: { profissionalId: idSchema, confirmado: { type: 'boolean' } }
    }
}

export const projetoSubstituicao = {
    body: {
        type: 'object',
        required: [...obrigatoriosProjeto, 'equipe', 'papel'],
        properties: { ...propriedadesProjeto, equipe: equipeAtual, papel: { type: 'string' }, rejeitados: { type: 'array', items: idSchema } }
    }
}

export const projetoConvite = {
    body: {
        type: 'object',
        required: [...obrigatoriosProjeto, 'equipe', 'papel', 'aceito'],
        properties: { ...propriedadesProjeto, equipe: equipeAtual, papel: { type: 'string' }, aceito: { type: 'boolean' }, rejeitados: { type: 'array', items: idSchema } }
    }
}

/** Aceita tanto o valor ("DIRETOR DE FOTOGRAFIA") quanto o nome do enum ("DIRETOR_FOTOGRAFIA"). */
export function normalizarPapel(texto: string): Papel {
    const valores = Object.values(Papel) as string[]
    if (valores.includes(texto)) return texto as Papel
    const pelaChave = (Papel as Record<string, string>)[texto]
    if (pelaChave) return pelaChave as Papel
    throw new ErroValidacao(`Papel inválido: "${texto}". Use: ${valores.join(", ")}`)
}

interface CorpoProjeto {
    id: number; genero: Genero; tipo: TipoProjeto; duracaoMin: number; orcamento: number; prazo: string
    competencias: Record<string, Array<{ nome: string, nivel: number }>>
    pesos?: Record<string, number>
    estrategia: string
    parametros?: Record<string, any>
    /** Atributos específicos do tipo: tema/entrevistados, tecnica/cenas, cliente/veiculos. */
    detalhes?: Record<string, unknown>
}
interface CorpoSubstituicao extends CorpoProjeto { equipe: EquipeAtualDTO, papel: string, rejeitados?: Array<string | number> }
interface CorpoConvite extends CorpoSubstituicao { aceito: boolean }

/** Abstract Factory: a fábrica do tipo cria o projeto concreto; aqui não há if/switch por tipo. */
export function montarProjeto(body: CorpoProjeto, registro: RegistroFabricas = RegistroFabricas.padrao()): Projeto {
    const competencias = new Map<Papel, Competencias[]>(
        Object.entries(body.competencias).map(([papel, lista]) => [
            normalizarPapel(papel),
            lista.map((c) => new Competencias(c.nivel, c.nome)),
        ])
    )
    const pesos = new Map<Papel, number>(
        Object.entries(body.pesos ?? {}).map(([papel, peso]) => [normalizarPapel(papel), peso])
    )
    return registro.obter(body.tipo).criarProjeto({
        id: String(body.id), genero: body.genero, duracaoMin: body.duracaoMin, orcamento: body.orcamento,
        prazo: new Date(body.prazo), competencias, pesos, estrategia: body.estrategia, detalhes: body.detalhes,
    })
}

function normalizarEquipe(dto: EquipeAtualDTO): EquipeAtualDTO {
    const resultado: EquipeAtualDTO = {}
    for (const [papel, ref] of Object.entries(dto)) resultado[normalizarPapel(papel)] = ref
    return resultado
}

export class RecomendacaoController {
    constructor(private service: ServiceRecomendacao, private registro: RegistroFabricas = RegistroFabricas.padrao()) {}

    recomendar = async (request: FastifyRequest<{ Body: CorpoProjeto }>, reply: FastifyReply) => {
        const body = request.body
        const resultado = await this.service.recomendar(montarProjeto(body, this.registro), criarEstrategia(body.estrategia, body.parametros))
        return reply.status(200).send({ Recomendacao: resultado.equipe, degradado: resultado.degradado })
    }

    substituir = async (request: FastifyRequest<{ Body: CorpoSubstituicao }>, reply: FastifyReply) => {
        const body = request.body
        const resultado = await this.service.substituir(
            montarProjeto(body, this.registro), criarEstrategia(body.estrategia, body.parametros),
            normalizarEquipe(body.equipe), normalizarPapel(body.papel), (body.rejeitados ?? []).map(String))
        return reply.status(200).send({ Recomendacao: resultado.equipe, degradado: resultado.degradado })
    }

    responderConvite = async (request: FastifyRequest<{ Body: CorpoConvite }>, reply: FastifyReply) => {
        const body = request.body
        const resultado = await this.service.responderConvite(
            montarProjeto(body, this.registro), criarEstrategia(body.estrategia, body.parametros),
            normalizarEquipe(body.equipe), normalizarPapel(body.papel), body.aceito, (body.rejeitados ?? []).map(String))
        return reply.status(200).send({ Recomendacao: resultado.equipe, degradado: resultado.degradado })
    }
}
