import { StatusPagamento } from "./AdaptadorPagamento";
import BaseAdaptadorPagamento from "./BaseAdaptadorPagamento";
import GatewayPagamento from "./simuladores/GatewayPagamento";
import SimuladorPayPal from "./simuladores/SimuladorPayPal";

export default class AdaptadorPayPal extends BaseAdaptadorPagamento{
    protected statusDoProvedor:Record<string,StatusPagamento>={COMPLETED:"APROVADO",REFUNDED:"CANCELADO",DENIED:"RECUSADO",PENDING:"PENDENTE"}
    constructor(gateway:GatewayPagamento=new SimuladorPayPal()){ super(gateway) }
}
