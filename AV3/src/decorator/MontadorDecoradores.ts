import { ErroValidacao } from "../erros";
import RecomendacaoStrategy from "../Strategy/RecomendacaoStrategy";
import AuditoriaDecorator from "./AuditoriaDecorator";
import CacheDecorator, { OpcoesCache } from "./CacheDecorator";
import CompressaoDecorator from "./CompressaoDecorator";

export type NomeDecorator="cache"|"auditoria"|"compressao"

export interface PoliticaDecoradores{
    /** Ordem em que são aplicados: o primeiro envolve a base; o último fica por fora. */
    decoradores:NomeDecorator[]
    cache?:OpcoesCache
}

const criadores:Record<NomeDecorator,(interna:RecomendacaoStrategy,p:PoliticaDecoradores)=>RecomendacaoStrategy>={
    cache:(i,p)=>new CacheDecorator(i,p.cache),
    auditoria:(i)=>new AuditoriaDecorator(i),
    compressao:(i)=>new CompressaoDecorator(i),
}
export const decoradoresDisponiveis=Object.keys(criadores) as NomeDecorator[]

/** Monta em tempo de execução a pilha de decorators definida por política/preferência do produtor. */
export function aplicarDecoradores(base:RecomendacaoStrategy,politica:PoliticaDecoradores):RecomendacaoStrategy{
    return politica.decoradores.reduce((interna,nome)=>{
        const criar=criadores[String(nome).toLowerCase() as NomeDecorator]
        if(!criar) throw new ErroValidacao(`Decorator desconhecido: "${nome}". Use: ${decoradoresDisponiveis.join(", ")}`)
        return criar(interna,politica)
    },base)
}
