/** Resultado de uma transação do gateway (formato "bruto" do provedor). */
export interface Transacao{
    id:string
    valor:number
    status:string
}

/** Interface "estrangeira" (Adaptee) dos gateways de pagamento simulados. */
export default interface GatewayPagamento{
    processarPagamento(valor:number,dados:any):Transacao;
    estornarPagamento(id:string):boolean;
    consultarStatus(id:string):string;
}
