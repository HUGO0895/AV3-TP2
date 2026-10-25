import BaseGatewaySimulado from "./BaseGatewaySimulado";

/** PagSeguro simulado: valores em reais e status em português/maiúsculas. */
export default class SimuladorPagSeguro extends BaseGatewaySimulado{
    protected prefixo="PAGS"
    protected statusAprovado="PAGO"
    protected statusEstornado="DEVOLVIDO"
    protected statusRecusado="NEGADO"
    protected paraUnidadeDoProvedor(v:number){ return v }
}
