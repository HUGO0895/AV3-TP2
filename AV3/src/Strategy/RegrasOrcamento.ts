import { Papel } from "../Equipe/Enum/papel";
import Profissional from "../Equipe/Modelo/Profissional";
import Projeto from "../Projetos/Modelo/projetos";
import RecomendacaoStrategy from "./RecomendacaoStrategy";
import { papeisDoProjeto } from "./auxiliares";
import solver from "javascript-lp-solver";

export interface OpcoesOrcamento {
    /** Multiplica a nota pelo peso do papel no projeto. Padrão: true. */
    usarPesos?: boolean
    /** Candidatos por papel enviados ao solver (melhores notas + mais baratos). Padrão: 50. */
    topPorPapel?: number
}

export default class RegrasOrcamento implements RecomendacaoStrategy {
    private usarPesos: boolean
    private topPorPapel: number

    constructor(opcoes: OpcoesOrcamento = {}) {
        this.usarPesos = opcoes.usarPesos ?? true
        this.topPorPapel = Math.max(1, opcoes.topPorPapel ?? 50)
    }

    recomendar(projeto: Projeto, profissionais: Array<Profissional>): Map<Papel, Profissional> {
        const MapaEquipe: Map<Papel, Profissional> = new Map()
        const papeis = papeisDoProjeto(projeto)
        const model: any = {
            optimize: "score",
            opType: "max",
            constraints: {
                orcamento: { max: projeto.orcamento },
            },
            variables: {},
            ints: {}
        }

        for (const papel of papeis) {
            model.constraints[papel] = { equal: 1 }
        }

        const papeisPedidosPeloProjeto = new Set<Papel>(papeis)

        // Pré-seleção por papel: mantém o solver rápido com milhares de profissionais.
        const media = (p: Profissional) => p.avaliacoes.reduce((acu, a) => acu + a.notaDoProfissional, 0) / p.avaliacoes.length
        const elegiveis = new Set<string>()
        for (const papel of papeis) {
            const candidatos = profissionais.filter((p) => p.precoMedio <= projeto.orcamento && p.avaliacoes.some((a) => a.papel === papel))
            const melhores = [...candidatos].sort((a, b) => media(b) - media(a)).slice(0, this.topPorPapel)
            const baratos = [...candidatos].sort((a, b) => a.precoMedio - b.precoMedio).slice(0, this.topPorPapel)
            for (const p of [...melhores, ...baratos]) elegiveis.add(`${p.getId()}|${papel}`)
        }

        for (const profissional of profissionais) {
            if (profissional.avaliacoes.length === 0) continue
            const papeisDeAtuacao = Array.from(
                new Set(
                    profissional.avaliacoes
                        .map((avaliacao) => avaliacao.papel)
                        .filter((papel) => papeisPedidosPeloProjeto.has(papel))
                        .filter((papel) => elegiveis.has(`${profissional.getId()}|${papel}`))
                )
            )
            if (papeisDeAtuacao.length === 0) continue
            const mediaGeral = media(profissional)
            model.constraints[`${profissional.getId()}_max`] = { max: 1 }
            for (const papel of papeisDeAtuacao) {
                const chave = `${profissional.getId()}_${papel}`
                const peso = this.usarPesos ? projeto.pesoDe(papel) : 1
                model.variables[chave] = { score: mediaGeral * peso, orcamento: profissional.precoMedio, [papel]: 1, [`${profissional.getId()}_max`]: 1 }
                model.ints[chave] = 1
            }
        }

        const resultado: any = solver.Solve(model);
        // Problema inviável (orçamento curto ou papel sem candidato): equipe vazia, sem lançar erro.
        if (!resultado.feasible) return MapaEquipe
        const { feasible, result, bounded, isIntegral, ...escolhidos } = resultado
        for (const chave of Object.keys(escolhidos)) {
            if (escolhidos[chave] !== 1) continue
            const separador = chave.indexOf('_')
            const id = chave.slice(0, separador)
            const papel = chave.slice(separador + 1) as Papel
            const escolhido = profissionais.find((prof) => prof.getId() === id)
            if (escolhido) MapaEquipe.set(papel, escolhido)
        }
        return MapaEquipe;
    }
}
