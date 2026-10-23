import { EventEmitter } from "events";
import EventoRecomendacao from "./EventoRecomendacao";
import Observador from "./Observador";

/**
 * Porta de saída de eventos. Hoje é implementada em memória (EventEmitter);
 * para usar RabbitMQ basta criar outra implementação desta interface.
 */
export interface BarramentoEventos {
    publicar(evento: EventoRecomendacao): void
    assinar(tipo: string, manipulador: (evento: EventoRecomendacao) => void): void
}

export class BarramentoEmMemoria implements BarramentoEventos {
    private emissor = new EventEmitter()

    publicar(evento: EventoRecomendacao): void {
        this.emissor.emit(evento.tipo, evento)
        this.emissor.emit("*", evento)
    }

    /** Use "*" para receber todos os tipos. */
    assinar(tipo: string, manipulador: (evento: EventoRecomendacao) => void): void {
        this.emissor.on(tipo, manipulador)
    }
}

/** Observer que repassa cada evento ao barramento (gerência de projetos, financeiro...). */
export default class PublicadorEventos implements Observador {
    constructor(private barramento: BarramentoEventos) {}

    atualizar(evento: EventoRecomendacao): void {
        this.barramento.publicar(evento)
    }
}
