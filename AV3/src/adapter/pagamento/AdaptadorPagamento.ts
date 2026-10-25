/** Contrato padronizado de pagamentos (Adapter: interface alvo). Status devolvidos: PENDENTE, APROVADO, CANCELADO, RECUSADO. */
export type StatusPagamento="PENDENTE"|"APROVADO"|"CANCELADO"|"RECUSADO"|"DESCONHECIDO"

export default interface AdaptadorPagamento{
    efetuarPagamento(valor:number,origem:string,destino:string):string;
    cancelarPagamento(id:string):boolean;
    verificarPagamento(id:string):string;
}
