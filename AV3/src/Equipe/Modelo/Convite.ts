import { ErroNegocio } from "../../erros";
import { Papel } from "../Enum/papel";
import Profissional from "./Profissional";

export type StatusConvite = "PENDENTE" | "ACEITO" | "RECUSADO";

export default class Convite {
  public status: StatusConvite = "PENDENTE";

  constructor(public readonly papel: Papel, public readonly profissional: Profissional) {}

  aceitar(): void {
    this.garantirPendente();
    this.status = "ACEITO";
  }

  recusar(): void {
    this.garantirPendente();
    this.status = "RECUSADO";
  }

  private garantirPendente(): void {
    if (this.status !== "PENDENTE") {
      throw new ErroNegocio(`Convite já respondido (${this.status})`);
    }
  }
}
