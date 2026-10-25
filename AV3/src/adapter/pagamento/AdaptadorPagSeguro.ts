import { StatusPagamento } from "./AdaptadorPagamento";
import BaseAdaptadorPagamento from "./BaseAdaptadorPagamento";
import GatewayPagamento from "./simuladores/GatewayPagamento";
import SimuladorPagSeguro from "./simuladores/SimuladorPagSeguro";

export default class AdaptadorPagSeguro extends BaseAdaptadorPagamento{
    protected statusDoProvedor:Record<string,StatusPagamento>={PAGO:"APROVADO",DEVOLVIDO:"CANCELADO",NEGADO:"RECUSADO",AGUARDANDO:"PENDENTE"}
    constructor(gateway:GatewayPagamento=new SimuladorPagSeguro()){ super(gateway) }
}
