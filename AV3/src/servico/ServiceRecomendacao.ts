import { Papel } from "../Equipe/Enum/papel";
import Equipe from "../Equipe/Modelo/equipe";
import MembroEquipe from "../Equipe/Modelo/membroEquipe";
import Profissional from "../Equipe/Modelo/Profissional";
import { ErroNegocio, ErroServicoIndisponivel } from "../erros";
import { logEstruturado } from "../logger";
import Projeto from "../Projetos/Modelo/projetos";
import SistemaRecomendacao from "../SistemaRecomendacao/SistemaRecomendacao";
import RecomendacaoStrategy from "../Strategy/RecomendacaoStrategy";

/** Porta de acesso aos profissionais (inversão de dependência). */
export interface ProfissionalProvider {
    buscarTodos(): Promise<Array<Profissional>>
}

export interface EquipeAtualDTO {
    [papel: string]: { profissionalId: string | number, confirmado?: boolean }
}

export interface ResultadoRecomendacao {
    equipe: Equipe
    /** true quando os dados vieram do cache por indisponibilidade do repositório. */
    degradado: boolean
}

export interface OpcoesService {
    cacheTtlMs?: number
    tentativas?: number
    agora?: () => number
}

export default class ServiceRecomendacao{
    private cache?: { dados: Array<Profissional>, em: number }
    private cacheTtlMs: number
    private tentativas: number
    private agora: () => number

    constructor(
        private provider: ProfissionalProvider,
        private SistemaDeRecomendacao: SistemaRecomendacao,
        opcoes: OpcoesService = {}
    ){
        this.cacheTtlMs = opcoes.cacheTtlMs ?? 30_000
        this.tentativas = Math.max(1, opcoes.tentativas ?? 2)
        this.agora = opcoes.agora ?? Date.now
    }

    public async recomendar(projeto: Projeto, estrategia: RecomendacaoStrategy): Promise<ResultadoRecomendacao>{
        const { profissionais, degradado } = await this.carregarProfissionais()
        const equipe = this.SistemaDeRecomendacao.executarEstrategia(projeto, profissionais, estrategia)
        return { equipe, degradado }
    }

    public async substituir(projeto: Projeto, estrategia: RecomendacaoStrategy, equipeAtual: EquipeAtualDTO, papel: Papel, rejeitados: Array<string> = []): Promise<ResultadoRecomendacao>{
        const { profissionais, degradado } = await this.carregarProfissionais()
        const equipe = this.reconstruirEquipe(equipeAtual, profissionais)
        const resultado = this.SistemaDeRecomendacao.substituirMembro(projeto, equipe, papel, profissionais, rejeitados, estrategia)
        return { equipe: resultado, degradado }
    }

    public async responderConvite(projeto: Projeto, estrategia: RecomendacaoStrategy, equipeAtual: EquipeAtualDTO, papel: Papel, aceito: boolean, rejeitados: Array<string> = []): Promise<ResultadoRecomendacao>{
        const { profissionais, degradado } = await this.carregarProfissionais()
        const equipe = this.reconstruirEquipe(equipeAtual, profissionais)
        const resultado = this.SistemaDeRecomendacao.responderConvite(projeto, equipe, papel, aceito, profissionais, rejeitados, estrategia)
        return { equipe: resultado, degradado }
    }

    /** Cache + retry + fallback: se o repositório cair, usa os últimos dados conhecidos. */
    private async carregarProfissionais(): Promise<{ profissionais: Array<Profissional>, degradado: boolean }>{
        if (this.cache && this.agora() - this.cache.em < this.cacheTtlMs) {
            return { profissionais: this.cache.dados, degradado: false }
        }
        let ultimoErro: unknown
        for (let tentativa = 1; tentativa <= this.tentativas; tentativa++) {
            try {
                const dados = await this.provider.buscarTodos()
                this.cache = { dados, em: this.agora() }
                return { profissionais: dados, degradado: false }
            } catch (erro) {
                ultimoErro = erro
                logEstruturado("warn", "repositorio_profissionais_falhou", { tentativa, erro: String(erro) })
            }
        }
        if (this.cache) {
            logEstruturado("warn", "fallback_cache_profissionais", { idadeMs: this.agora() - this.cache.em })
            return { profissionais: this.cache.dados, degradado: true }
        }
        throw new ErroServicoIndisponivel(`Repositório de profissionais indisponível: ${String(ultimoErro)}`)
    }

    private reconstruirEquipe(dto: EquipeAtualDTO, profissionais: Array<Profissional>): Equipe {
        const membros: Array<MembroEquipe> = []
        for (const [papelTexto, ref] of Object.entries(dto)) {
            const profissional = profissionais.find((p) => p.getId() === String(ref.profissionalId))
            if (!profissional) throw new ErroNegocio(`Profissional ${ref.profissionalId} não encontrado`)
            membros.push(new MembroEquipe(papelTexto as Papel, ref.confirmado ?? false, profissional))
        }
        return new Equipe(new Date(), 'formada', membros)
    }
}
