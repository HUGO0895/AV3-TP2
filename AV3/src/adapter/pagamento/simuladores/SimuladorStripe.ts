import BaseGatewaySimulado from "./BaseGatewaySimulado";

/** Stripe simulado: valores em centavos e status em inglês. */
export default class SimuladorStripe extends BaseGatewaySimulado{
    protected prefixo="ch"
    protected statusAprovado="succeeded"
    protected statusEstornado="refunded"
    protected statusRecusado="failed"
    protected paraUnidadeDoProvedor(v:number){ return Math.round(v*100) }
}
