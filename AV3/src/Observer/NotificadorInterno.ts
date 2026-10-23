import { logEstruturado } from "../logger";
import EventoRecomendacao from "./EventoRecomendacao";
import Observador from "./Observador";

export default class NotificadorInterno implements Observador{
    atualizar(evento: EventoRecomendacao): void {
        logEstruturado("info", "mensagem_interna", {
            observador: "NOTIFICADOR-INTERNO",
            tipoEvento: evento.tipo,
            mensagem: "Enviando dados para serviços internos",
        })
    }
}
