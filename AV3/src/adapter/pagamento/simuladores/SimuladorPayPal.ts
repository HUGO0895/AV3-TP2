import BaseGatewaySimulado from "./BaseGatewaySimulado";

/** PayPal simulado: valores em reais e status em inglês/maiúsculas. */
export default class SimuladorPayPal extends BaseGatewaySimulado{
    protected prefixo="PP"
    protected statusAprovado="COMPLETED"
    protected statusEstornado="REFUNDED"
    protected statusRecusado="DENIED"
    protected paraUnidadeDoProvedor(v:number){ return v }
}
