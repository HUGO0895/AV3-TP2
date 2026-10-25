import { StatusPagamento } from "./AdaptadorPagamento";
import BaseAdaptadorPagamento from "./BaseAdaptadorPagamento";
import GatewayPagamento from "./simuladores/GatewayPagamento";
import SimuladorStripe from "./simuladores/SimuladorStripe";

export default class AdaptadorStripe extends BaseAdaptadorPagamento{
    protected statusDoProvedor:Record<string,StatusPagamento>={succeeded:"APROVADO",refunded:"CANCELADO",failed:"RECUSADO",pending:"PENDENTE"}
    constructor(gateway:GatewayPagamento=new SimuladorStripe()){ super(gateway) }
}
