import { logEstruturado } from "../logger";
import EventoRecomendacao from "./EventoRecomendacao";
import Observador from "./Observador";

export default class NotificadorEmail implements Observador{
    atualizar(evento: EventoRecomendacao): void {
        for(const membro of evento.dados.membrosEquipe){
            logEstruturado("info", "email_enviado", {
                observador: "NOTIFICADOR-EMAIL",
                tipoEvento: evento.tipo,
                destinatario: membro.profissional.nome,
                papel: membro.papel,
                mensagem: `Enviando Emails para ${membro.profissional.nome}`,
            })
        }
    }
}
