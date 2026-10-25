import { ErroValidacao } from "../../erros";
import AdaptadorPagamento, { StatusPagamento } from "./AdaptadorPagamento";
import GatewayPagamento from "./simuladores/GatewayPagamento";

/**
 * Parte comum dos adaptadores: valida a entrada e traduz o vocabulário de status do provedor
 * para o padronizado. Cada adaptador concreto só informa o seu mapa de status.
 */
export default abstract class BaseAdaptadorPagamento implements AdaptadorPagamento{
    constructor(protected gateway:GatewayPagamento){}
    protected abstract statusDoProvedor:Record<string,StatusPagamento>

    efetuarPagamento(valor:number,origem:string,destino:string):string{
        if(!(valor>0)) throw new ErroValidacao("Valor do pagamento deve ser positivo")
        if(!origem || !destino) throw new ErroValidacao("Origem e destino do pagamento são obrigatórios")
        return this.gateway.processarPagamento(valor,{origem,destino}).id
    }
    cancelarPagamento(id:string):boolean{ return this.gateway.estornarPagamento(id) }
    verificarPagamento(id:string):string{
        return this.statusDoProvedor[this.gateway.consultarStatus(id)] ?? "DESCONHECIDO"
    }
}
