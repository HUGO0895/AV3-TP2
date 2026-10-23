import { logEstruturado } from "../logger";
import EventoRecomendacao from "./EventoRecomendacao";
import Observador from "./Observador";

export default class AuditoriaRecomendacao implements Observador{
    atualizar(evento: EventoRecomendacao): void {
        logEstruturado("info", "auditoria", {
            observador: "LOG AUDITORIA",
            tipoEvento: evento.tipo,
            origem: evento.origem,
            statusEquipe: evento.dados.status,
            membros: evento.dados.membrosEquipe.map((m) => ({
                papel: m.papel,
                profissionalId: m.profissional.getId(),
                nome: m.profissional.nome,
                confirmado: m.confirmado,
            })),
            detalhes: evento.detalhes,
        })
    }
}
