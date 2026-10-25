import { ErroNegocio } from "../../../erros";
import GatewayPagamento, { Transacao } from "./GatewayPagamento";

/** Comportamento comum dos simuladores; cada provedor define prefixo de id, unidade do valor e vocabulário de status. */
export default abstract class BaseGatewaySimulado implements GatewayPagamento{
    protected transacoes=new Map<string,Transacao>()
    private contador=0
    protected abstract prefixo:string
    protected abstract statusAprovado:string
    protected abstract statusEstornado:string
    protected abstract statusRecusado:string
    /** Converte o valor em reais para a unidade do provedor. */
    protected abstract paraUnidadeDoProvedor(valorEmReais:number):number

    processarPagamento(valor:number,dados:any):Transacao{
        if(!(valor>0)) throw new ErroNegocio(`${this.prefixo}: valor inválido`)
        const id=`${this.prefixo}_${++this.contador}`
        const recusado=dados?.recusar===true
        const t:Transacao={id,valor:this.paraUnidadeDoProvedor(valor),status:recusado?this.statusRecusado:this.statusAprovado}
        this.transacoes.set(id,t)
        return {...t}
    }
    estornarPagamento(id:string):boolean{
        const t=this.transacoes.get(id)
        if(!t || t.status!==this.statusAprovado) return false
        t.status=this.statusEstornado
        return true
    }
    consultarStatus(id:string):string{
        const t=this.transacoes.get(id)
        if(!t) throw new ErroNegocio(`${this.prefixo}: transação ${id} não encontrada`)
        return t.status
    }
}
