import { gunzipSync, gzipSync } from "zlib";
import { Papel } from "../Equipe/Enum/papel";
import Profissional from "../Equipe/Modelo/Profissional";
import Projeto from "../Projetos/Modelo/projetos";
import RecomendacaoStrategy from "../Strategy/RecomendacaoStrategy";
import DecoratorRecomendacao from "./DecoratorRecomendacao";

export interface EstatisticaCompressao{
    bytesOriginais:number
    bytesComprimidos:number
}

/**
 * Comprime (gzip) a carga serializada da recomendação, que é o que trafega na rede.
 * A interface continua devolvendo o Map; a carga comprimida e as estatísticas ficam disponíveis
 * em `ultimaCarga` / `ultimaEstatistica`, e `descomprimir` faz o caminho inverso.
 */
export default class CompressaoDecorator extends DecoratorRecomendacao{
    public ultimaCarga?:Buffer
    public ultimaEstatistica?:EstatisticaCompressao

    constructor(strategy:RecomendacaoStrategy){ super(strategy) }

    recomendar(projeto:Projeto,profissionais:Array<Profissional>):Map<Papel,Profissional>{
        const resultado=this.strategy.recomendar(projeto,profissionais)
        const json=Buffer.from(JSON.stringify(Array.from(resultado.entries()).map(([papel,p])=>({
            papel,id:p.getId(),nome:p.nome,precoMedio:p.precoMedio,competencias:p.competencias,disponibilidade:p.disponibiliade,avaliacoes:p.avaliacoes.length,
        }))),"utf8")
        this.ultimaCarga=gzipSync(json)
        this.ultimaEstatistica={bytesOriginais:json.length,bytesComprimidos:this.ultimaCarga.length}
        return resultado
    }

    static descomprimir(carga:Buffer):Array<{papel:string,id:string,nome:string}>{
        return JSON.parse(gunzipSync(carga).toString("utf8"))
    }
}
